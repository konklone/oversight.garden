# Elasticsearch index management.

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

    host = ENV['host'] || "http://localhost:9200"
    index = $config['elasticsearch']['index']
    index_url = "#{host}/#{index}"

    if force
      command = "curl -XDELETE '#{index_url}'"
      puts "running: #{command}"
      system command
      puts

      puts "Deleted index"
      puts
    end

    command = "curl -XPUT '#{index_url}'"
    puts "running: #{command}"
    system command
    puts

    puts "Ensured index exists"
    puts

    command = "curl -XPOST '#{index_url}/_close'"
    puts "running: #{command}"
    system command
    puts

    puts "Closed index"
    puts

    command = "curl -XPUT '#{index_url}/_settings' -d @config/index.json"
    puts "running: #{command}"
    system command
    puts

    puts "Configured index"
    puts

    command = "curl -XPOST '#{index_url}/_open'"
    puts "running: #{command}"
    system command
    puts

    puts "Opened index"
    puts

    mappings.each do |mapping|
      command = "curl -XPUT '#{index_url}/_mapping/#{mapping}' -d @config/mappings/#{mapping}.json"
      puts "running: #{command}"
      system command
      puts

      puts "Created #{mapping}"
      puts
    end
  end
end
