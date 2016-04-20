
## Gets loaded once, upon app boot or during a rake task.

require 'bundler/setup'
require 'elasticsearch/persistence/model'
require 'yaml'

class Environment
  def self.config
    @config ||= YAML.load_file(ENV["config"] || File.join(File.dirname(__FILE__), "config.yaml"))
  end

  def self.init_client!
    # Define elasticsearch client.
    if Environment.config['elasticsearch']['host'].nil?
      puts "The elasticsearch server's hostname is not set in the configuration file"
      exit
    end

    if Environment.config['elasticsearch']['port'].nil?
      puts "The elasticsearch server's port number is not set in the configuration file"
      exit
    end

    if Environment.config['elasticsearch']['index_read'].nil?
      puts "The elasticsearch server's index name for reading is not set in the configuration file"
      exit
    end

    if Environment.config['elasticsearch']['index_write'].nil?
      puts "The elasticsearch server's index name for writing is not set in the configuration file"
      exit
    end

    log = ENV['log'] || false
    endpoint = "http://#{Environment.config['elasticsearch']['host']}:#{Environment.config['elasticsearch']['port']}"
    @elasticsearch_client = Elasticsearch::Client.new url: endpoint, log: log
  end

  def self.client
    @elasticsearch_client
  end
end

Environment.init_client!


## Models for easy introspection.

class Report
  include Elasticsearch::Persistence::Model
  index_name Environment.config['elasticsearch']['index_read']
  document_type "reports"

  attribute :title, String
  attribute :inspector, String
  attribute :agency, String
  attribute :featured, Hash
  attribute :is_featured, Boolean
  attribute :report_id, String
  attribute :pdf, Hash
  attribute :type, String
  attribute :url, String
  attribute :year, Fixnum
end
