require "net/http"

class SslChecker

  def initialize(host:)
    @host = host
  end

  def expires_in(reference_time: Time.now)
    cert.not_after - reference_time
  end

  def cert
    @cert ||= fetch_certificate
  end

  private

  def fetch_certificate
    http = Net::HTTP.new(@host, 443)
    http.use_ssl = true

    # Explicitly setting cert_store like this is not needed in most cases but it
    # seems necessary in edge cases such as when using `verify_callback` in some
    # combination of Ruby + OpenSSL versions.
    http.cert_store = OpenSSL::X509::Store.new
    http.cert_store.set_default_paths

    http.verify_mode = OpenSSL::SSL::VERIFY_PEER

    cert = nil

    http.verify_callback = lambda { |verify_ok, store_context|
      cert = store_context.current_cert.dup
      true
    }

    req = Net::HTTP::Head.new('/')

    res = http.start { http.request(req) }

    cert
  end
end
