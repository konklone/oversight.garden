task :environment do
  require './config/environment'
end

scss_main = "public/scss/main.scss"
css_main = "public/css/main.css"
scss_dashboard = "public/scss/dashboard.scss"
css_dashboard = "public/css/dashboard.css"

task :watch do
  sh "bundle exec sass --watch #{scss_main}:#{css_main} #{scss_dashboard}:#{css_dashboard}"
end

task :clean do
  remove_file css_main, :force => true
  remove_file css_dashboard, :force => true
end

load "tasks/elasticsearch.rake"
load "tasks/sitemap.rake"
load "tasks/aws.rake"
load "tasks/letsencrypt/letsencrypt.rake"
load "tasks/letsencrypt/letsencrypt_scrapers.rake"

task :blog do
  sh "node_modules/.bin/wintersmith build --config=config/blog.js"
end

