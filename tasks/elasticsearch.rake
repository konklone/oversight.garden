# Elasticsearch index management.

require 'bundler/setup'
require 'elasticsearch'
require 'json'

namespace :elasticsearch do

  # options:
  #   only - only one mapping, please
  #   force - delete the mapping first (okay...)
  #   index - which index to initialize
  desc "Initialize ES mappings"
  task init: :environment do
    single = ENV['only'] || nil
    force = ENV['force'] || false
    also_alias = ENV['alias'] || false
    index = ENV['index']
    if not index then
      raise "Missing required argument 'index'"
    end

    mappings = single ? [single] : Dir.glob('config/mappings/*.json').map {|dir| File.basename dir, File.extname(dir)}

    index_settings = JSON.parse(File.read('config/index.json'))

    create_index index

    Environment.client.indices.close index: index
    puts "Closed index"

    begin
      Environment.client.indices.put_settings index: index, body: index_settings
      puts "Configured index"
    ensure
      Environment.client.indices.open index: index
      puts "Opened index"
    end

    mappings.each do |mapping|
      mapping_raw = File.read("config/mappings/#{mapping}.json")
      mapping_config = JSON.parse(mapping_raw)

      Environment.client.indices.put_mapping index: index, type: mapping, body: mapping_config
      puts "Created #{mapping}"
    end

    # Optionally, alias the new index to both read and write.
    if also_alias
      change_alias Environment.config['elasticsearch']['index_read'], index
      change_alias Environment.config['elasticsearch']['index_write'], index
    end

    initialize_dashboard
  end

  def create_index(index)
    force = ENV['force'] || false
    if force
      if Environment.client.indices.exists index: index
        Environment.client.indices.delete index: index
        puts "Deleted index '#{index}'"
      end
      Environment.client.indices.create index: index
      Environment.client.cluster.health wait_for_status: 'yellow'
      puts "Created index '#{index}'"
    else
      if Environment.client.indices.exists index: index
        puts "Index '#{index}' already exists"
      else
        Environment.client.indices.create index: index
        Environment.client.cluster.health wait_for_status: 'yellow'
        puts "Created index '#{index}'"
      end
    end
  end

  def initialize_dashboard
    index = Environment.config['elasticsearch']['index_dashboard']
    create_index index
    mapping_raw = File.read("config/dashboard_scraper_info.json")
    mapping_config = JSON.parse(mapping_raw)
    Environment.client.indices.put_mapping index: index, type: "scraper_info", body: mapping_config
    puts "Created scraper_info"
  end

  desc "List all indices and their aliases"
  task list: :environment do
    for index, aliases in Environment.client.indices.get_aliases do
      if !(index.start_with? ".") then
        puts "#{index}, #{aliases['aliases'].length} aliases"
        for alias_, options in aliases['aliases'] do
          if options.length > 0 then
            puts "  #{alias_}: #{options}"
          else
            puts "  #{alias_}"
          end
        end
      end
    end
  end

  def change_alias(name, index)
    actions = []
    if Environment.client.indices.exists_alias name: name then
      old = Environment.client.indices.get_alias name: name
      for old_index, _ in old do
        actions.push({ remove: { index: old_index, alias: name } })
      end
    end
    actions.push({ add: { index: index, alias: name } })
    Environment.client.indices.update_aliases body: { actions: actions }
    puts "Aliased #{name} to point to #{index}"
  end

  desc "Create or update the reading index alias"
  # options:
  #   index - which index to point to
  task alias_read: :environment do
    alias_name = Environment.config['elasticsearch']['index_read']
    index = ENV['index']
    if not index then
      raise "Missing required argument 'index'"
    end
    change_alias alias_name, index
  end

  desc "Create or update the writing index alias"
  # options:
  #   index - which index to point to
  task alias_write: :environment do
    alias_name = Environment.config['elasticsearch']['index_write']
    index = ENV['index']
    if not index then
      raise "Missing required argument 'index'"
    end
    change_alias alias_name, index
  end

  desc "Delete an index"
  # options:
  #   index - which index to delete
  task delete: :environment do
    index = ENV['index']
    if not index then
      raise "Missing required argument 'index'"
    end

    aliases =  [Environment.config['elasticsearch']['index_read'], Environment.config['elasticsearch']['index_write']]
    if Environment.client.indices.get_alias(name: aliases.join(","), index: index).length > 0 then
      raise "That index is currently used by an alias, reassign aliases before deleting the index"
    end

    Environment.client.indices.delete index: index
    Environment.client.cluster.health wait_for_status: 'yellow'
    puts "Deleted index #{index}"
  end
end
