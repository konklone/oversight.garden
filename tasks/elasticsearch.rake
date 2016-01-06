# Elasticsearch index management.

require 'bundler/setup'
require 'elasticsearch'
require 'json'

namespace :elasticsearch do

  desc "Initialize ES mappings"
  # options:
  #   only - only one mapping, please
  #   force - delete the mapping first (okay...)
  #   host - defaults to http://localhost:9200
  task init: :environment do
    single = ENV['only'] || nil
    force = ENV['force'] || false

    mappings = single ? [single] : Dir.glob('config/mappings/*.json').map {|dir| File.basename dir, File.extname(dir)}

    settings = JSON.parse(File.read('config/index.json'))

    host = ENV['host'] || "http://localhost:9200"
    index = $config['elasticsearch']['index']
    index_url = "#{host}/#{index}"

    client = Elasticsearch::Client.new url: host, log: true, index: index

    if !client.indices.exists index: index
      client.indices.create index: index
      client.cluster.health wait_for_status: 'green'

      puts "Created index"
      puts
    else
      if force
        client.indices.delete index: index

        puts "Deleted index"
        puts
      else
        puts "Index already exists"
        puts
      end
    end

    client.indices.close index: index

    puts "Closed index"
    puts

    begin
      client.indices.put_settings index: index, body: settings

      puts "Configured index"
      puts
    ensure
      client.indices.open index: index

      puts "Opened index"
      puts
    end

    mappings.each do |mapping|
      mapping_raw = File.read("config/mappings/#{mapping}.json")
      mapping_config = JSON.parse(mapping_raw)
      client.indices.put_mapping index: index, type: mapping, body: mapping_config

      puts "Created #{mapping}"
      puts
    end
  end
end
