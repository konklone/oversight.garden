
require 'bundler/setup'
require 'elasticsearch/persistence/model'

class Report
  include Elasticsearch::Persistence::Model
  index_name $config['elasticsearch']['index']
  document_type "reports"

  attribute :title, String
  attribute :inspector, String
  attribute :agency, String
end
