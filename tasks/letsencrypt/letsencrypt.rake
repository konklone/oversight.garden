require_relative 'lets_encrypt_route53'

namespace :letsencrypt do
  le = LetsEncryptRoute53.new.tap do |config|
    config.endpoint           = LetsEncryptRoute53::PRODUCTION
    config.domains            = ['oversight.garden',
                                 'www.oversight.garden',
                                 'staging.oversight.garden',
                                 'www.staging.oversight.garden']
    config.region             = 'us-east-1'
    config.s3_bucket          = 'oversight-secrets'
    config.s3_key_acct        = 'letsencrypt.acct.pem'
    config.s3_key_privkey     = 'letsencrypt.privkey.pem'
    config.s3_key_cert        = 'letsencrypt.cert.pem'
    config.s3_key_chain       = 'letsencrypt.chain.pem'
    config.s3_key_fullchain   = 'letsencrypt.fullchain.pem'
    config.path_acct          = '/home/ubuntu/letsencrypt.acct.pem'
    config.path_privkey       = '/home/ubuntu/letsencrypt.privkey.pem'
    config.path_cert          = '/home/ubuntu/letsencrypt.cert.pem'
    config.path_chain         = '/home/ubuntu/letsencrypt.chain.pem'
    config.path_fullchain     = '/home/ubuntu/letsencrypt.fullchain.pem'
    config.kms_key_id         = '66c6c116-e0f7-425e-b2f6-a750373a242e'
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
