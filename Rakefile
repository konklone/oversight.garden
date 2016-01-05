task :environment do
  require 'yaml'
  config_path = ENV['config'] || "config/config.yaml"
  config_raw = File.read(config_path)
  $config = YAML.load(config_raw)
  # require './config/environment'
end

load "tasks/elasticsearch.rake"
load "tasks/sitemap.rake"
