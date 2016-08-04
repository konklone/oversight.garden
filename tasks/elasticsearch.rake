# Elasticsearch index management.

require 'bundler/setup'
require 'elasticsearch'
require 'json'

namespace :elasticsearch do

  # options:
  #   only - only one mapping, please
  #   force - delete the mapping first (okay...)
  #   index - which index to initialize
  desc "Initialize ES report mapping"
  task init: :environment do
    force = ENV['force'] || false
    also_alias = ENV['alias'] || false
    index = ENV['index']
    if not index then
      raise "Missing required argument 'index'"
    end

    index_settings = JSON.parse(File.read('config/index.json'))
    mapping_config = JSON.parse(File.read("config/mappings/reports.json"))

    create_index index, { reports: mapping_config }, index_settings

    # Optionally, alias the new index to both read and write.
    if also_alias
      change_alias Environment.config['elasticsearch']['index_read'], index
      change_alias Environment.config['elasticsearch']['index_write'], index
    end
  end

  def create_index(index, mappings = {}, settings = {})
    # disable redundancy on all indices by default
    settings['number_of_replicas'] = 0

    force = ENV['force'] || false
    if force
      if Environment.client.indices.exists index: index
        Environment.client.indices.delete index: index
        puts "Deleted index '#{index}'"
      end
      Environment.client.indices.create index: index,
        body: {
          mappings: mappings,
          settings: settings
      }
      Environment.client.cluster.health wait_for_status: 'yellow'
      puts "Created index '#{index}'"
    else
      if Environment.client.indices.exists index: index
        puts "Index '#{index}' already exists"
      else
        Environment.client.indices.create index: index,
          body: {
            mappings: mappings,
            settings: settings
        }
        Environment.client.cluster.health wait_for_status: 'yellow'
        puts "Created index '#{index}'"
      end
    end
  end

  desc "Initialize ES index and mapping for dashboard"
  task init_dashboard: :environment do
    index = Environment.config['elasticsearch']['index_dashboard']
    mapping_config = JSON.parse(File.read("config/dashboard_scraper_info.json"))
    create_index index, {scraper_info: mapping_config}
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
