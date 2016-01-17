task :environment do
  require 'yaml'
  config_path = ENV['config'] || "config/config.yaml"
  config_raw = File.read(config_path)
  $config = YAML.load(config_raw)
  # require './config/environment'
end

scss = "public/scss/main.scss"
css = "public/css/main.css"

task :watch do
  sh "bundle exec sass --watch #{scss}:#{css}"
end

task :clean do
  remove_file css, :force => true
end

load "tasks/elasticsearch.rake"
load "tasks/sitemap.rake"
