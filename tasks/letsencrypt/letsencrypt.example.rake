require "lets_encrypt_route53"
require "ssl_checker"


namespace :letsencrypt do

  desc "Refresh the LetsEncrypt certificate if the current one expires in < 30 days"
  task :validate => [:check, :refresh]

  task :refresh do
    le = LetsEncryptRoute53.new.tap do |config|
      config.domain             = "www.staging.scalar.sh"
      config.endpoint           = LetsEncryptRoute53::PRODUCTION
      config.s3_bucket          = "ops.scalar.sh"
      config.s3_key             = "#{config.domain}.letsencrypt.key.pem"
      config.kms_key_id         = "{key id}"
      config.contact_email      = "ops+letsencrypt@scalar.sh"
      config.hosted_zone_id     = "Z34YXXXXXXXXXX"
      config.load_balancer_name = "scalar-staging"
    end

    le.refresh_certificate!
  end

  task :check do
    if (expires_in = SslChecker.new(host: "www.staging.scalar.sh").expires_in) > 30.days
      days = expires_in.to_i / 1.day
      puts "Current certificate is valid, and expires in #{days} days. Not updating."
      exit 0
    end
  end
end
