namespace :sitemap do
  desc "Generate a sitemap."
  task generate: :environment do
    require 'big_sitemap'
    require 'json'
    require "cgi"
    BigSitemap.generate(
      base_url: "https://oversight.io/",
      document_root: "public/sitemap",
      url_path: "sitemap",
      ping_google: false,  # TODO: add option to ping, add more crawlers
      ping_bing: false) do

      # Add homepage and list of inspectors
      add "/", change_frequency: "weekly"
      add "/inspectors", change_frequency: "monthly"

      # Skip search results and search result Atom feeds

      # Add each inspector landing page
      inspectors_raw = File.read("config/inspectors.json")
      inspectors = JSON.parse(inspectors_raw)
      inspectors.each do |inspector|
        add "/inspector/" + inspector['slug'], change_frequency: "weekly"
      end

      # Add each report landing page
      data_dir = $config['inspectors']['data']
      Dir.foreach(data_dir) do |inspector|
        next if inspector == "." or inspector == ".."
        next if not File.directory?(File.join(data_dir, inspector))
        Dir.foreach(File.join(data_dir, inspector)) do |year|
          next if year == "." or year == ".."
          next if not File.directory?(File.join(data_dir, inspector, year))
          Dir.foreach(File.join(data_dir, inspector, year)) do |report_id|
            next if report_id == "." or report_id == ".."
            next if not File.directory?(File.join(data_dir, inspector, year, report_id))
            next if not File.exist?(File.join(data_dir, inspector, year, report_id, "report.json"))
            add "/report/" + inspector + "/" + CGI.escape(report_id), change_frequency: "monthly"
          end
        end
      end
    end
  end
end
