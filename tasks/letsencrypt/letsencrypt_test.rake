require_relative 'lets_encrypt_route53'

namespace :letsencrypt_test do
  le = LetsEncryptRoute53.new.tap do |config|
    config.endpoint           = LetsEncryptRoute53::STAGING
    config.domains            = ['oversight.garden', 'www.oversight.garden']
    config.region             = 'us-east-1'
    config.s3_bucket          = 'oversight-secrets'
    config.s3_key_acct        = 'letsencrypt-test.acct.pem'
    config.s3_key_privkey     = 'letsencrypt-test.privkey.pem'
    config.s3_key_cert        = 'letsencrypt-test.cert.pem'
    config.s3_key_chain       = 'letsencrypt-test.chain.pem'
    config.s3_key_fullchain   = 'letsencrypt-test.fullchain.pem'
    config.path_acct          = '/home/ubuntu/letsencrypt-test.acct.pem'
    config.path_privkey       = '/home/ubuntu/letsencrypt-test.privkey.pem'
    config.path_cert          = '/home/ubuntu/letsencrypt-test.cert.pem'
    config.path_chain         = '/home/ubuntu/letsencrypt-test.chain.pem'
    config.path_fullchain     = '/home/ubuntu/letsencrypt-test.fullchain.pem'
    config.kms_key_id         = '78d1ff86-f350-4e92-9b1a-c1fe8a9445c4'
    config.contact_email      = 'eric+oversight@konklone.com'
    config.hosted_zone_id     = 'Z373JK35FYSEGP'
  end

  desc 'Fetch keys and certificates from S3'
  task :fetch do
    le.fetch_files!
  end

  desc 'Renew the Let\'s Encrypt certificate if the current one expires in '\
       '30 days'
  task :renew do
    expires_in = le.expires_in
    if !expires_in.nil? && expires_in > 30 * 24 * 60 * 60
      days = expires_in.to_i / 24 / 60 / 60
      puts "Current certificate is valid, and expires in #{days} days. "\
           'Not updating.'
    else
      le.refresh_certificate!
    end
  end
end
