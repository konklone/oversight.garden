
require 'bundler/setup'
require 'elasticsearch/persistence/model'

class Report
  include Elasticsearch::Persistence::Model
  index_name "oversight"
  document_type "reports"

  attribute :title, String
  attribute :inspector, String
  attribute :agency, String
end
