require 'acme/client'
require 'aws-sdk'
require 'openssl'

# Container class with logic to request and save certificates, using Route 53
# to respond to dns-01 challenges
class LetsEncryptRoute53
  STAGING    = 'https://acme-staging-v02.api.letsencrypt.org/directory'.freeze
  PRODUCTION = 'https://acme-v02.api.letsencrypt.org/directory'.freeze

  attr_accessor :endpoint,           # STAGING or PRODUCTION
                :domains,            # Domains we're obtaining a certificate for
                :region,             # AWS region
                :s3_bucket,          # Where should we store the LE key/cert
                :s3_key_acct,        # name for account key
                :s3_key_privkey,     # name for private key
                :s3_key_cert,        # name for leaf certificate
                :s3_key_chain,       # name for certificate chain
                :s3_key_fullchain,   # name for concatenated certificate chain
                :path_acct,          # local file path for account key
                :path_privkey,       # local file path for private key
                :path_cert,          # local file path for for certificate
                :path_chain,         # local file path for certificate chain
                :path_fullchain,     # local file path for concatenated certificate chain
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
    order = acme.new_order(identifiers: domains)
    order.authorizations.each do |authorization|
      domain = authorization.domain
      challenge = authorization.dns
      set_dns_record(domain, challenge)
      request_dns_verification(challenge)
    end
    csr = generate_certificate_signing_request
    request_certificate(order, csr)
    write_certificate(order, csr)
    upload_certificate(order, csr)
    order.authorizations.each do |authorization|
      domain = authorization.domain
      challenge = authorization.dns
      remove_dns_verification_record(domain, challenge)
    end
  end

  def private_key
    @private_key ||=
      say 'preparing the private key' do
        key = load_key
        if key
          mark_key_as_registered
          key
        else
          puts 'Doesn\'t seem to exist on disk, creating a new one.'
          generate_and_upload_key
        end
      end
  end

  def register_key
    require_attrs! :contact_email

    say 'registering key with LetEncrypt' do
      acme.new_account(contact: "mailto:#{contact_email}", terms_of_service_agreed: true)
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
      challenge.request_validation
      loop do
        print '.'
        challenge.reload
        break if challenge.status != 'pending'
        sleep 2
      end
      if challenge.status != 'valid' then
        throw "Challenge status is #{challenge.status}"
      end
    end
  end

  def generate_certificate_signing_request
    require_attrs! :domains
    Acme::Client::CertificateRequest.new(names: domains)
  end

  def request_certificate(order, csr)
    say 'requesting certificate' do
      order.finalize(csr: csr)
      sleep(1) while order.status == 'processing'
    end
  end

  def write_certificate(order, csr)
    require_attrs! :path_privkey, :path_cert, :path_chain, :path_fullchain

    File.write(path_privkey, csr.private_key.to_pem)
    fullchain = order.certificate
    cert, chain = fullchain.split(/(?<=-----END CERTIFICATE-----)/, 2).map(&:strip)
    File.write(path_cert, cert)
    File.write(path_chain, chain)
    File.write(path_fullchain, fullchain)
  end

  def upload_certificate(order, csr)
    require_attrs! :s3_bucket, :s3_key_privkey, :s3_key_cert, :s3_key_chain,\
                   :s3_key_fullchain, :kms_key_id

    fullchain = order.certificate
    cert, chain = fullchain.split(/(?<=-----END CERTIFICATE-----)/, 2).map(&:strip)

    s3_encryption.put_object(
      bucket: s3_bucket,
      key: s3_key_privkey,
      body: csr.private_key.to_pem
    )
    s3.put_object(
      bucket: s3_bucket,
      key: s3_key_cert,
      body: cert
    )
    s3.put_object(
      bucket: s3_bucket,
      key: s3_key_chain,
      body: chain
    )
    s3.put_object(
      bucket: s3_bucket,
      key: s3_key_fullchain,
      body: fullchain
    )
  end

  def expires_in(reference_time: Time.now)
    require_attrs! :path_cert

    if File.file? path_cert
      raw = File.read path_cert
      certificate = OpenSSL::X509::Certificate.new raw
      certificate.not_after - reference_time
    end
  end

  def fetch_files!
    require_attrs! :s3_bucket, :s3_key_cert, :s3_key_chain,\
                   :s3_key_fullchain, :s3_key_acct, :s3_key_privkey,\
                   :kms_key_id, :path_acct, :path_privkey, :path_cert,\
                   :path_chain, :path_fullchain
    File.write(
      path_acct,
      s3_encryption.get_object(
        bucket: s3_bucket,
        key: s3_key_acct
      ).body.read
    )
    File.write(
      path_privkey,
      s3_encryption.get_object(
        bucket: s3_bucket,
        key: s3_key_privkey
      ).body.read
    )
    File.write(
      path_cert,
      s3.get_object(
        bucket: s3_bucket,
        key: s3_key_cert
      ).body.read
    )
    File.write(
      path_chain,
      s3.get_object(
        bucket: s3_bucket,
        key: s3_key_chain
      ).body.read
    )
    File.write(
      path_fullchain,
      s3.get_object(
        bucket: s3_bucket,
        key: s3_key_fullchain
      ).body.read
    )
  end

  def remove_dns_verification_record(domain, challenge)
    require_attrs! :hosted_zone_id

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

  def load_key
    require_attrs! :path_acct

    if File.file? path_acct
      plaintext_key = File.read(path_acct)
      OpenSSL::PKey::RSA.new(plaintext_key)
    end
  end

  def generate_and_upload_key
    require_attrs! :s3_bucket, :s3_key_acct, :kms_key_id, :path_acct

    say 'generating a new key and uploading to S3' do
      private_key = OpenSSL::PKey::RSA.new(4096)
      File.write(path_acct, private_key.to_pem)
      s3_encryption.put_object(
        bucket: s3_bucket,
        key: s3_key_acct,
        body: private_key.to_pem
      )
      private_key
    end
  end

  def acme
    require_attrs! :region

    @acme = Acme::Client.new(private_key: private_key, directory: endpoint)
  end

  def iam
    require_attrs! :region

    @iam = Aws::IAM::Client.new(region: region)
  end

  def kms
    require_attrs! :region

    @kms = Aws::KMS::Client.new(region: region)
  end

  def route53
    require_attrs! :region

    @route53 = Aws::Route53::Client.new(region: region)
  end

  def s3
    require_attrs! :region

    @s3 = Aws::S3::Client.new(region: region)
  end

  def s3_encryption
    require_attrs! :region, :kms_key_id

    @s3_encryption = Aws::S3::Encryption::Client.new(
      region: region,
      kms_key_id: kms_key_id,
      kms_client: kms
    )
  end

  def require_attrs!(*attrs)
    if attrs.any? { |a| send(a).nil? || send(a).empty? }
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
      puts sprintf('=> %0.2fs', (Time.now - start).to_f)
    end
    @indent_level -= 2
    result
  end
end
