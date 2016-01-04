task :environment do
  # require './config/environment'
  require 'yaml'
  config_path = ENV['config'] || "config/config.yaml"
  config_raw = File.read(config_path)
  $config = YAML.load(config_raw)
end

load "tasks/elasticsearch.rake"
load "tasks/sitemap.rake"
