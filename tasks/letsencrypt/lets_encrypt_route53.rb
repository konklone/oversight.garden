require "acme/client"
require "aws-sdk"
require "openssl"

class LetsEncryptRoute53

  STAGING    = "https://acme-staging.api.letsencrypt.org/"
  PRODUCTION = "https://acme-v01.api.letsencrypt.org/"

  attr_accessor :endpoint,           # STAGING or PRODUCTION
                :domain,             # Domain we're obtaining a certificate for
                :s3_bucket, :s3_key, # Where should we store the LE private key
                :kms_key_id,         # Which KMS key to encrypt the LE pkey?
                :contact_email,      # LE Registration email
                :hosted_zone_id,     # Route53 Zone for domain, eg "Z34Y2JMNKJ3H4S"
                :load_balancer_name  # ELB to attach the cert


  def initialize(endpoint: STAGING)
    @endpoint = endpoint
  end

  # Do everything
  def refresh_certificate!
    register_key if key_needs_registered?
    auth, challenge = obtain_authorization
    set_dns_record(challenge)
    request_dns_verification(challenge)
    csr = generate_certificate_signing_request
    certificate = request_certificate(csr)
    iam_cert = upload_server_cert(certificate)
    update_elb(iam_cert)
    cleanup_old_certs(certificate)
    remove_dns_verification_record(challenge)
  end

  def private_key
    @private_key ||=
      say "preparing the private key" do
        key = fetch_and_decrypt_key
        if key
          mark_key_as_registered
          key
        else
          puts "Doesn't seem to exist in S3, creating a new one."
          key = generate_and_upload_key
        end
      end
  end

  def register_key
    require_attrs! :contact_email

    say "registering key with LetEncrypt" do
      registration = acme.register(contact: "mailto:#{contact_email}")
      registration.agree_terms
    end
  end

  def obtain_authorization
    require_attrs! :domain
    say "obtaining authorization for #{domain}" do
      authorization = acme.authorize(domain: domain)
      challenge = authorization.dns01

      [authorization, challenge]
    end
  end

  def set_dns_record(challenge)
    require_attrs! :domain, :hosted_zone_id

    change = {
      hosted_zone_id: hosted_zone_id,
      change_batch: {
        comment: "Add LetsEncrypt DNS01 challenge",
        changes: [
          {
            action: "UPSERT",
            resource_record_set: {
              name: [challenge.record_name, domain].join("."),
              type: challenge.record_type,
              ttl:  1,
              resource_records: [ { value: challenge.record_content.inspect } ]
            }
          }
        ]
      }
    }

    say "applying Route53 Record change" do
      resp = route53.change_resource_record_sets(change)
      # It can take 10-20 seconds to apply, so wait for it
      loop do
        print "."
        change = route53.get_change(id: resp.change_info.id)
        break if change.change_info.status == "INSYNC"
        sleep 2
      end
      resp
    end
  end

  def request_dns_verification(challenge)
    say "requesting verification" do
      challenge.request_verification
      loop do
        print "."
        status = challenge.verify_status
        break if status == "valid"
        sleep 1
      end
    end
  end

  def generate_certificate_signing_request
    require_attrs! :domain
    Acme::Client::CertificateRequest.new(names: [domain])
  end

  def request_certificate(csr)
    say "requesting certificate" do
      acme.new_certificate(csr)
    end
  end

  def upload_server_cert(certificate)
    require_attrs! :domain

    cert_name = iam_cert_name(certificate)

    say "Uploading Server Certificate to IAM" do
      iam.upload_server_certificate({
        server_certificate_name: cert_name,
        certificate_body: certificate.to_pem,
        private_key: certificate.request.private_key.to_pem,
        certificate_chain: certificate.chain_to_pem
      })
    end
  end

  def update_elb(iam_cert)
    require_attrs! :load_balancer_name

    say "Updating ELB to use cert" do
      tries = 0
      begin
        print "."
        resp = elb.set_load_balancer_listener_ssl_certificate({
          load_balancer_name: load_balancer_name,
          load_balancer_port: 443,
          ssl_certificate_id: iam_cert.server_certificate_metadata.arn
        })
      rescue Aws::ElasticLoadBalancing::Errors::CertificateNotFound => ex
        tries += 1
        if tries <= 5
          sleep 10
          retry
        else
          raise ex
        end
      end
    end
  end

  def cleanup_old_certs(current_cert)
    current_cert_name = iam_cert_name(current_cert)

    say "Cleaning up previous certs" do
      resp = iam.list_server_certificates
      resp.server_certificate_metadata_list.each do |server_cert|
        name = server_cert.server_certificate_name
        next if name == current_cert_name
        suffix = "-#{domain.gsub(".", "_")}"
        if name.ends_with? suffix
          begin
            iam.delete_server_certificate(server_certificate_name: name)
          rescue Aws::IAM::Errors::DeleteConflict => ex
            # Key in use, we'll delete it next time
          end
        end
      end
    end
  end

  def remove_dns_verification_record(challenge)
    require_attrs! :hosted_zone_id, :domain

    change = {
      hosted_zone_id: hosted_zone_id,
      change_batch: {
        comment: "Remove LetsEncrypt DNS01 challenge",
        changes: [
          {
            action: "DELETE",
            resource_record_set: {
              name: [challenge.record_name, domain].join("."),
              type: challenge.record_type,
              ttl:  1,
              resource_records: [ { value: challenge.record_content.inspect } ]
            }
          }
        ]
      }
    }

    say "removing Route53 txt Record" do
      resp = route53.change_resource_record_sets(change)
      # It can take 10-20 seconds to apply, so wait for it
      loop do
        print "."
        change = route53.get_change(id: resp.change_info.id)
        break if change.change_info.status == "INSYNC"
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
    require_attrs! :s3_bucket, :s3_key

    say "fetching key from S3" do
      ciphertext_key = s3.get_object(bucket: s3_bucket, key: s3_key).body.read
      plaintext_key = kms.decrypt(ciphertext_blob: ciphertext_key).plaintext
      private_key = OpenSSL::PKey::RSA.new(plaintext_key)
    end
  rescue Aws::S3::Errors::NoSuchKey => ex
    nil
  end

  def generate_and_upload_key
    require_attrs! :s3_bucket, :s3_key, :kms_key_id

    say "generating a new key and uploading to S3" do
      private_key = OpenSSL::PKey::RSA.new(4096)
      ciphertext_key = kms.encrypt(plaintext: private_key.to_pem, key_id: kms_key_id).ciphertext_blob
      s3.put_object(bucket: s3_bucket, key: s3_key, body: ciphertext_key)
      private_key
    end
  end

  def acme
    @acme = Acme::Client.new(private_key: private_key, endpoint: endpoint)
  end

  def iam_cert_name(certificate)
    [
      certificate.x509.serial.to_s,
      certificate.x509.not_after.strftime("%Y%m%d%H%M%S"),
      domain
    ].join('-').gsub(".", "_")
  end


  def elb
    @elb = Aws::ElasticLoadBalancing::Client.new
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

  def require_attrs!(*attrs)
    fail "#{attrs.inspect} are required" unless attrs.all? { |a| send(a).present? }
  end

  # Pretty-print whats happening. Also prints the timing if given a block
  def say(*msgs)
    @indent_level ||= -2
    @indent_level += 2
    print " " * @indent_level
    puts msgs.join(" ")
    if block_given?
      print " " * @indent_level
      start = Time.now
      result = yield
      puts "=> %0.2fs" % (Time.now - start).to_f
    end
    @indent_level -= 2
    result
  end
end
