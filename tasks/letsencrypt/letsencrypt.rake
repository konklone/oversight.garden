require_relative 'lets_encrypt_route53'
require_relative 'ssl_checker'

namespace :letsencrypt do
  def refresh
    le = LetsEncryptRoute53.new.tap do |config|
      config.endpoint           = LetsEncryptRoute53::STAGING
      config.domains            = ['staging.oversight.garden',
                                   'www.staging.oversight.garden']
      config.s3_bucket          = 'oversight-secrets'
      config.s3_key_key         = 'letsencrypt.key.pem'
      config.s3_key_cert        = 'letsencrypt.cert.pem'
      config.s3_key_chain       = 'letsencrypt.chain.pem'
      config.path_key           = '/home/ubuntu/letsencrypt.key.pem'
      config.path_cert          = '/home/ubuntu/letsencrypt.cert.pem'
      config.path_chain         = '/home/ubuntu/letsencrypt.chain.pem'
      config.kms_key_id         = '66c6c116-e0f7-425e-b2f6-a750373a242e'
      config.contact_email      = 'eric@konklone.com'
      config.hosted_zone_id     = 'Z373JK35FYSEGP'
    end

    le.refresh_certificate!
  end

  desc 'Refresh the Let\'s Encrypt certificate if the current one expires in '\
       '30 days'
  task :check do
    expires_in = SslChecker.new(config.domains[0]).expires_in
    if expires_in > 30.days
      days = expires_in.to_i / 1.day
      puts "Current certificate is valid, and expires in #{days} days. "\
           'Not updating.'
    else
      refresh
    end
  end
end
