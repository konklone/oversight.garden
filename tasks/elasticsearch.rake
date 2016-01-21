# Elasticsearch index management.

require 'bundler/setup'
require 'elasticsearch'
require 'json'

namespace :elasticsearch do

  # options:
  #   log - show HTTP requests and responses
  task client: [:environment] do
    if $config['elasticsearch']['host'].nil?
      fail "The elasticsearch server's hostname is not set in the configuration file"
    end
    if $config['elasticsearch']['port'].nil?
      fail "The elasticsearch server's port number is not set in the configuration file"
    end
    if $config['elasticsearch']['index_read'].nil?
      fail "The elasticsearch server's index name for reading is not set in the configuration file"
    end
    if $config['elasticsearch']['index_write'].nil?
      fail "The elasticsearch server's index name for writing is not set in the configuration file"
    end

    log = ENV['log'] || false
    endpoint = "http://#{$config['elasticsearch']['host']}:#{$config['elasticsearch']['port']}"
    $elasticsearch_client = Elasticsearch::Client.new url: endpoint, log: log
  end

  # options:
  #   only - only one mapping, please
  #   force - delete the mapping first (okay...)
  #   index - which index to initialize
  desc "Initialize ES mappings"
  task init: [:environment, :client] do
    single = ENV['only'] || nil
    force = ENV['force'] || false
    index = ENV['index']
    if not index then
      raise "Missing required argunent 'index'"
    end

    mappings = single ? [single] : Dir.glob('config/mappings/*.json').map {|dir| File.basename dir, File.extname(dir)}

    index_settings = JSON.parse(File.read('config/index.json'))

    if force
      if $elasticsearch_client.indices.exists index: index
        $elasticsearch_client.indices.delete index: index

        puts "Deleted index"
      end
      $elasticsearch_client.indices.create index: index
      $elasticsearch_client.cluster.health wait_for_status: 'green'

      puts "Created index"
    else
      if $elasticsearch_client.indices.exists index: index
        puts "Index already exists"
      else
        $elasticsearch_client.indices.create index: index
        $elasticsearch_client.cluster.health wait_for_status: 'green'

        puts "Created index"
      end
    end

    $elasticsearch_client.indices.close index: index

    puts "Closed index"

    begin
      $elasticsearch_client.indices.put_settings index: index, body: index_settings

      puts "Configured index"
    ensure
      $elasticsearch_client.indices.open index: index

      puts "Opened index"
    end

    mappings.each do |mapping|
      mapping_raw = File.read("config/mappings/#{mapping}.json")
      mapping_config = JSON.parse(mapping_raw)
      $elasticsearch_client.indices.put_mapping index: index, type: mapping, body: mapping_config

      puts "Created #{mapping}"
    end
  end

  desc "List all indices and their aliases"
  task list: [:environment, :client] do
    for index, aliases in $elasticsearch_client.indices.get_aliases do
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
    if $elasticsearch_client.indices.exists_alias name: name then
      old = $elasticsearch_client.indices.get_alias name: name
      for old_index, _ in old do
        actions.push({ remove: { index: old_index, alias: name } })
      end
    end
    actions.push({ add: { index: index, alias: name } })
    $elasticsearch_client.indices.update_aliases body: { actions: actions }
    puts "Aliased #{name} to point to #{index}"
  end

  desc "Create or update the reading index alias"
  # options:
  #   index - which index to point to
  task alias_read: [:environment, :client] do
    alias_name = $config['elasticsearch']['index_read']
    index = ENV['index']
    if not index then
      raise "Missing required argunent 'index'"
    end
    change_alias alias_name, index
  end

  desc "Create or update the writing index alias"
  # options:
  #   index - which index to point to
  task alias_write: [:environment, :client] do
    alias_name = $config['elasticsearch']['index_write']
    index = ENV['index']
    if not index then
      raise "Missing required argunent 'index'"
    end
    change_alias alias_name, index
  end

  desc "Delete an index"
  # options:
  #   index - which index to delete
  task delete: [:environment, :client] do
    index = ENV['index']
    if not index then
      raise "Missing required argunent 'index'"
    end

    aliases =  [$config['elasticsearch']['index_read'], $config['elasticsearch']['index_write']]
    if $elasticsearch_client.indices.get_alias(name: aliases.join(","), index: index).length > 0 then
      raise "That index is currently used by an alias, reassign aliases before deleting the index"
    end

    $elasticsearch_client.indices.delete index: index
    puts "Deleted index #{index}"
  end
end
