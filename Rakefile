task :environment do
  # require './config/environment'
  require 'yaml'
  config_raw = File.read("config/config.yaml")
  $config = YAML.load(config_raw)
end

load "tasks/elasticsearch.rake"
load "tasks/sitemap.rake"
