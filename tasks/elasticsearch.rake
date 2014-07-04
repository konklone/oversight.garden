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
    index = "oversight"
    index_url = "#{host}/#{index}"

    command = "curl -XPUT '#{index_url}'"
    puts "running: #{command}"
    system command
    puts

    puts "Ensured index exists"
    puts

    mappings.each do |mapping|
      if force
        command = "curl -XDELETE '#{index_url}/_mapping/#{mapping}/'"
        puts "running: #{command}"
        system command
        puts

        puts "Deleted #{mapping}"
        puts
      end

      command = "curl -XPUT '#{index_url}/_mapping/#{mapping}' -d @config/mappings/#{mapping}.json"
      puts "running: #{command}"
      system command
      puts

      puts "Created #{mapping}"
      puts
    end
  end
end