require 'acme/client'
require 'aws-sdk'
require 'openssl'

# Container class with logic to request and save certificates, using Route 53
# to respond to dns-01 challenges
class LetsEncryptRoute53
  STAGING    = 'https://acme-staging.api.letsencrypt.org/'.freeze
  PRODUCTION = 'https://acme-v01.api.letsencrypt.org/'.freeze

  attr_accessor :endpoint,           # STAGING or PRODUCTION
                :domains,            # Domains we're obtaining a certificate for
                :s3_bucket,          # Where should we store the LE key/cert
                :s3_key_key,         # name for private key
                :s3_key_cert,        # name for leaf certificate
                :s3_key_chain,       # name for certificate chain
                :path_key,           # local file path for private key
                :path_cert,          # local file path for for certificate
                :path_chain,         # local file path for certificate chain
                :kms_key_id,         # Which KMS key to encrypt the LE pkey?
                :contact_email,      # LE Registration email
                :hosted_zone_id,     # Route 53 Zone for domain

  def initialize(endpoint: STAGING)
    @endpoint = endpoint
  end

  # Do everything
  def refresh_certificate!
    require_attrs! :domains

    register_key if key_needs_registered?
    domains.each do |domain|
      _auth, challenge = obtain_authorization(domain)
      set_dns_record(domain, challenge)
      request_dns_verification(challenge)
    end
    csr = generate_certificate_signing_request
    certificate = request_certificate(csr)
    write_certificate(certificate)
    upload_certificate(certificate)
    remove_dns_verification_record(challenge)
  end

  def private_key
    @private_key ||=
      say 'preparing the private key' do
        key = fetch_and_decrypt_key
        if key
          mark_key_as_registered
          key
        else
          puts 'Doesn\'t seem to exist in S3, creating a new one.'
          generate_and_upload_key
        end
      end
  end

  def register_key
    require_attrs! :contact_email

    say 'registering key with LetEncrypt' do
      registration = acme.register(contact: "mailto:#{contact_email}")
      registration.agree_terms
    end
  end

  def obtain_authorization(domain)
    say "obtaining authorization for #{domain}" do
      authorization = acme.authorize(domain: domain)
      challenge = authorization.dns01

      [authorization, challenge]
    end
  end

  def set_dns_record(domain, challenge)
    require_attrs! :hosted_zone_id

    change = {
      hosted_zone_id: hosted_zone_id,
      change_batch: {
        comment: 'Add LetsEncrypt dns-01 challenge',
        changes: [
          {
            action: 'UPSERT',
            resource_record_set: {
              name: [challenge.record_name, domain].join('.'),
              type: challenge.record_type,
              ttl:  1,
              resource_records: [{ value: challenge.record_content.inspect }]
            }
          }
        ]
      }
    }

    say 'applying Route53 Record change' do
      resp = route53.change_resource_record_sets(change)
      # It can take 10-20 seconds to apply, so wait for it
      loop do
        print '.'
        change = route53.get_change(id: resp.change_info.id)
        break if change.change_info.status == 'INSYNC'
        sleep 2
      end
      resp
    end
  end

  def request_dns_verification(challenge)
    say 'requesting verification' do
      challenge.request_verification
      loop do
        print '.'
        status = challenge.verify_status
        break if status == 'valid'
        sleep 1
      end
    end
  end

  def generate_certificate_signing_request
    require_attrs! :domains
    Acme::Client::CertificateRequest.new(names: domains)
  end

  def request_certificate(csr)
    say 'requesting certificate' do
      acme.new_certificate(csr)
    end
  end

  def write_certificate(certificate)
    require_attrs! :path_cert, :path_chain

    File.write(path_cert, certificate.to_pem)
    File.write(path_chain, certificate.chain_to_pem)
  end

  def upload_certificate(certificate)
    require_attrs! :s3_bucket, :s3_key_cert, :s3_key_chain

    s3.put_object(
      bucket: s3_bucket,
      key: s3_key_cert,
      body: certificate.to_pem
    )
    s3.put_object(
      bucket: s3_bucket,
      key: s3_key_chain,
      body: certificate.chain_to_pem
    )
  end

  def remove_dns_verification_record(challenge)
    require_attrs! :hosted_zone_id, :domain

    change = {
      hosted_zone_id: hosted_zone_id,
      change_batch: {
        comment: 'Remove LetsEncrypt dns-01 challenge',
        changes: [
          {
            action: 'DELETE',
            resource_record_set: {
              name: [challenge.record_name, domain].join('.'),
              type: challenge.record_type,
              ttl:  1,
              resource_records: [{ value: challenge.record_content.inspect }]
            }
          }
        ]
      }
    }

    say 'removing Route53 txt Record' do
      resp = route53.change_resource_record_sets(change)
      # It can take 10-20 seconds to apply, so wait for it
      loop do
        print '.'
        change = route53.get_change(id: resp.change_info.id)
        break if change.change_info.status == 'INSYNC'
        sleep 2
      end
      resp
    end
  end

  private

  def key_needs_registered?
    private_key && !@key_already_registered
  end

  def mark_key_as_registered
    @key_already_registered = true
  end

  def fetch_and_decrypt_key
    require_attrs! :kms_key_id, :s3_bucket, :s3_key_key

    say 'fetching key from S3' do
      plaintext_key = s3_encryption.get_object(
        bucket: s3_bucket,
        key: s3_key_key
      ).body.read
      OpenSSL::PKey::RSA.new(plaintext_key)
    end
  rescue Aws::S3::Errors::NoSuchKey
    nil
  end

  def generate_and_upload_key
    require_attrs! :s3_bucket, :s3_key_key, :kms_key_id, :path_key

    say 'generating a new key and uploading to S3' do
      private_key = OpenSSL::PKey::RSA.new(4096)
      File.write(path_key, private_key.to_pem)
      s3_encryption.put_object(
        bucket: s3_bucket,
        key: s3_key_key,
        body: private_key.to_pem
      )
      private_key
    end
  end

  def acme
    @acme = Acme::Client.new(private_key: private_key, endpoint: endpoint)
  end

  def iam
    @iam = Aws::IAM::Client.new
  end

  def kms
    @kms = Aws::KMS::Client.new
  end

  def route53
    @route53 = Aws::Route53::Client.new
  end

  def s3
    @s3 = Aws::S3::Client.new
  end

  def s3_encryption
    @s3 = Aws::S3::Encryption::Client.new(
      kms_key_id: kms_key_id,
      kms_client: kms
    )
  end

  def require_attrs!(*attrs)
    unless attrs.all? { |a| send(a).present? }
      raise "#{attrs.inspect} are required"
    end
  end

  # Pretty-print whats happening. Also prints the timing if given a block
  def say(*msgs)
    @indent_level ||= -2
    @indent_level += 2
    print ' ' * @indent_level
    puts msgs.join(' ')
    if block_given?
      print ' ' * @indent_level
      start = Time.now
      result = yield
      puts '=> %0.2fs'.format((Time.now - start).to_f)
    end
    @indent_level -= 2
    result
  end
end
