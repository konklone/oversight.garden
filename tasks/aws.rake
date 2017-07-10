require 'aws-sdk'
require 'net/http'
require 'net/https'
require_relative 'ubuntu_cloud_images'

Module.new do
  extend Rake::DSL

  @region = 'us-east-1'
  @availability_zone = 'us-east-1b'
  @key_name = 'erickey'
  @instance_type = 't2.small'
  @scraper_iam_instance_profile = 'arn:aws:iam::786276019377:instance-profile/oversight'
  @web_iam_instance_profile = 'arn:aws:iam::786276019377:instance-profile/oversight-web'
  @device_name = '/dev/xvdf'
  @subnet = 'subnet-ae40b184'
  @web_security_group = 'sg-72ba4108'
  @scraper_security_group = 'sg-db5e2ba2'
  @route53_zone = 'Z373JK35FYSEGP'

  @ami_release = 'xenial'
  @ami_virtualization = 'hvm'
  @ami_disk = 'ebs-ssd'

  @ec2 = Aws::EC2::Resource.new(region: @region)
  @ec2_client = Aws::EC2::Client.new(region: @region)
  @route53 = Aws::Route53::Client.new(region: @region)

  class HTTPWithIP < Net::HTTP
    def ip_address
      io = @socket
      while defined? io.io
        io = io.io
      end
      io.peeraddr[3]
    end
  end

  def self.get_ipv6_address(instance_id)
    response = @ec2_client.describe_instances({instance_ids: [instance_id]})
    response.reservations[0].instances[0].network_interfaces[0].ipv_6_addresses[0].ipv_6_address
  end

  namespace :aws do
    desc "List running EC2 instances"
    task list_instances: :environment do
      @ec2.instances.each do |instance|
        if instance.state.name == "running"
          role = ""
          instance.tags.each do |tag|
            if tag.key == "role"
              role = tag.value
            end
          end
          puts "#{role}\t#{instance.public_ip_address}\t#{get_ipv6_address instance.id}\t#{instance.public_dns_name}\t#{instance.id}"
        end
      end
    end

    desc "Create scraper instance"
    task create_scraper_instance: :environment do
      if @ec2.instances({filters: [
        {name: "tag:role", values: ["scraper"]},
        {name: "instance-state-name", values: ["pending", "running", "shutting-down", "stopping", "stopped"]}
      ]}).count > 0 then
        raise "There is already a scraper instance, bailing out"
      end

      volumes = @ec2.volumes({filters: [{name: "tag:role", values: ["scraper"]}]})
      if volumes.count != 1 then
        raise "Expected one scraper volume but found #{volumes.count}"
      end
      volume = volumes.entries[0]
      if volume.attachments.length > 0 then
        raise "Scraper volume is already attached to an instance"
      end

      script = File.read('tasks/scraper_user_data')
      instance = @ec2.create_instances({
        image_id: find_ami(@ami_release, @region, @ami_virtualization, @ami_disk),
        min_count: 1,
        max_count: 1,
        key_name: @key_name,
        user_data: Base64.encode64(script),
        instance_type: @instance_type,
        placement: {
          availability_zone: @availability_zone
        },
        network_interfaces: [{
          device_index: 0,
          associate_public_ip_address: true,
          ipv_6_address_count: 1
        }],
        iam_instance_profile: {
          arn: @scraper_iam_instance_profile
        }
      })
      puts "Created instance #{instance[0].id}"

      # Using the instance ID immediately after it is created can cause API
      # errors, and wait_until(:instance_exists... wouldn't work due to
      # https://github.com/aws/aws-sdk-ruby/issues/859
      sleep 15

      instance.batch_create_tags({
        tags: [{
          key: 'role',
          value: 'scraper'
        }]
      })

      puts "Waiting for instance to pass status checks"
      @ec2.client.wait_until(:instance_status_ok, {instance_ids: [instance[0].id]})

      volume.attach_to_instance({instance_id: instance[0].id, device: @device_name})
      puts "Attached volume to instance"

      instance2 = @ec2.instances({instance_ids: [instance[0].id]})
      ipv6_address = get_ipv6_address instance[0].id
      puts "Instance #{instance2.entries[0].id} is running at #{instance2.entries[0].public_dns_name}, #{instance2.entries[0].public_ip_address}, #{ipv6_address}"

      @route53.change_resource_record_sets({
        hosted_zone_id: @route53_zone,
        change_batch: {
          comment: "Automatic scrapers subdomain update for new instance",
          changes: [
            {
              action: "UPSERT",
              resource_record_set: {
                name: "scrapers.oversight.garden",
                type: "A",
                ttl: 300,
                resource_records: [
                  {
                    value: instance2.entries[0].public_ip_address
                  }
                ]
              }
            },
            {
              action: "UPSERT",
              resource_record_set: {
                name: "scrapers.oversight.garden",
                type: "AAAA",
                ttl: 300,
                resource_records: [
                  {
                    value: ipv6_address
                  }
                ]
              }
            }
          ]
        }
      })

      puts "DNS record for scrapers.oversight.garden updated"
    end

    desc "Create web instance"
    task create_web_instance: :environment do
      script = File.read('tasks/web_user_data')
      instance = @ec2.create_instances({
        image_id: find_ami(@ami_release, @region, @ami_virtualization, @ami_disk),
        min_count: 1,
        max_count: 1,
        key_name: @key_name,
        user_data: Base64.encode64(script),
        instance_type: @instance_type,
        placement: {
          availability_zone: @availability_zone,
        },
        network_interfaces: [{
          device_index: 0,
          associate_public_ip_address: true,
          ipv_6_address_count: 1,
          subnet_id: @subnet,
          groups: [@web_security_group]
        }],
        iam_instance_profile: {
          arn: @web_iam_instance_profile
        }
      })
      puts "Created instance #{instance[0].id}"

      sleep 15

      instance.batch_create_tags({
        tags: [{
          key: 'role',
          value: 'web',
        }]
      })

      puts "Waiting for instance to pass status checks"
      @ec2.client.wait_until(:instance_status_ok, {instance_ids: [instance[0].id]})

      instance2 = @ec2.instances({instance_ids: [instance[0].id]})
      ipv6_address = get_ipv6_address instance[0].id
      puts "Instance #{instance2.entries[0].id} is running at #{instance2.entries[0].public_dns_name}, #{instance2.entries[0].public_ip_address}, #{ipv6_address}"

      @route53.change_resource_record_sets({
        hosted_zone_id: @route53_zone,
        change_batch: {
          comment: "Automatic staging subdomain update for new web server",
          changes: [
            {
              action: "UPSERT",
              resource_record_set: {
                name: "staging.oversight.garden",
                type: "A",
                ttl: 300,
                resource_records: [
                  {
                    value: instance2.entries[0].public_ip_address
                  }
                ]
              }
            },
            {
              action: "UPSERT",
              resource_record_set: {
                name: "staging.oversight.garden",
                type: "AAAA",
                ttl: 300,
                resource_records: [
                  {
                    value: ipv6_address
                  }
                ]
              }
            },
            {
              action: "UPSERT",
              resource_record_set: {
                name: "www.staging.oversight.garden",
                type: "A",
                ttl: 300,
                resource_records: [
                  {
                    value: instance2.entries[0].public_ip_address
                  }
                ]
              }
            },
            {
              action: "UPSERT",
              resource_record_set: {
                name: "www.staging.oversight.garden",
                type: "AAAA",
                ttl: 300,
                resource_records: [
                  {
                    value: ipv6_address
                  }
                ]
              }
            }
          ]
        }
      })

      puts "DNS record for staging.oversight.garden updated"
    end

    desc "Promote staging web server to main domain"
    task promote: :environment do
      puts "Fetching DNS configuration"

      staging_ip = @route53.test_dns_answer({
        hosted_zone_id: @route53_zone,
        record_name: "staging.oversight.garden",
        record_type: "A",
      }).record_data[0]
      staging_ipv6 = @route53.test_dns_answer({
        hosted_zone_id: @route53_zone,
        record_name: "staging.oversight.garden",
        record_type: "AAAA",
      }).record_data[0]
      main_ip = @route53.test_dns_answer({
        hosted_zone_id: @route53_zone,
        record_name: "oversight.garden",
        record_type: "A",
      }).record_data[0]

      if staging_ip == main_ip then
        raise "Nothing to promote, staging.oversight.garden and oversight.garden already point to the same server"
      end

      puts "Checking health of staging.oversight.garden (#{staging_ip})"

      HTTPWithIP.start("staging.oversight.garden", 443,
                       :use_ssl => true,
                       :verify_mode => OpenSSL::SSL::VERIFY_PEER) do |http|
        if http.ip_address != staging_ip then
          raise "DNS cache is stale, connected to #{http.ip_address} instead of #{staging_ip}"
        end
        request = Net::HTTP::Get.new("/reports")
        response = http.request(request)
        if response.code != "200" then
          raise "Server in staging is not healthy, got a status code of #{response.code}"
        end
      end

      puts "Promoting #{staging_ip} to oversight.garden"

      @route53.change_resource_record_sets({
        hosted_zone_id: @route53_zone,
        change_batch: {
          comment: "Automatic promotion of web server from staging to main domain",
          changes: [
            {
              action: "UPSERT",
              resource_record_set: {
                name: "oversight.garden",
                type: "A",
                ttl: 300,
                resource_records: [
                  {
                    value: staging_ip
                  }
                ]
              }
            },
            {
              action: "UPSERT",
              resource_record_set: {
                name: "oversight.garden",
                type: "AAAA",
                ttl: 300,
                resource_records: [
                  {
                    value: staging_ipv6
                  }
                ]
              }
            },
            {
              action: "UPSERT",
              resource_record_set: {
                name: "www.oversight.garden",
                type: "A",
                ttl: 300,
                resource_records: [
                  {
                    value: staging_ip
                  }
                ]
              }
            },
            {
              action: "UPSERT",
              resource_record_set: {
                name: "www.oversight.garden",
                type: "AAAA",
                ttl: 300,
                resource_records: [
                  {
                    value: staging_ipv6
                  }
                ]
              }
            }
          ]
        }
      })

      puts "DNS record for oversight.garden updated"
    end

    namespace :ssh do
      def self.update_security_group(sg_id)
        public_ip = nil
        Net::HTTP.start("diagnostic.opendns.com", 443,
                        :use_ssl => true,
                        :verify_mode => OpenSSL::SSL::VERIFY_PEER) do |http|
          request = Net::HTTP::Get.new("/myip")
          response = http.request(request)
          if response.code != "200" then
            raise "Couldn't fetch this computer's public IP address, got a status code of #{response.code}"
          end
          public_ip = response.body
        end
        cidr = public_ip + "/32"

        flag = false
        sg = @ec2.security_group(sg_id)
        sg.ip_permissions.each do |rule|
          if rule.ip_protocol == "tcp" && rule.from_port == 22 && rule.to_port == 22
            rule.ip_ranges.each do |range|
              if range.cidr_ip == cidr
                flag = true
              end
            end
          end
        end

        if not flag
          puts "Updating security group for SSH access"
          sg.authorize_ingress({
            ip_protocol: "tcp",
            from_port: 22,
            to_port: 22,
            cidr_ip: cidr
          })
        end
      end

      def self.ssh(instance)
        exec("ssh", "ubuntu@#{instance.public_dns_name}")
      end

      def self.get_instances_with_role(filter_role)
        instances = []
        @ec2.instances.each do |instance|
          if instance.state.name == "running"
            role = ""
            instance.tags.each do |tag|
              if tag.key == "role"
                role = tag.value
              end
            end
            if role == filter_role
              instances.push instance
            end
          end
        end
        instances
      end

      def self.filter_instances_by_dns_record(instances_in, dns)
        filter_ip = @route53.test_dns_answer({
          hosted_zone_id: @route53_zone,
          record_name: dns,
          record_type: "A",
        }).record_data[0]

        instances_out = []
        instances_in.each do |instance|
          if instance.public_ip_address == filter_ip
            instances_out.push instance
          end
        end
        instances_out
      end

      desc "SSH into the scraper instance"
      task scraper: :environment do
        instances = get_instances_with_role("scraper")
        if instances.length > 0
          update_security_group(@scraper_security_group)
          ssh(instances[0])
        else
          print "Couldn't find a running scraper instance"
        end
      end

      desc "SSH into the staging web instance"
      task staging: :environment do
        instances = get_instances_with_role("web")
        instances = filter_instances_by_dns_record(instances, "staging.oversight.garden")
        if instances.length > 0
          update_security_group(@web_security_group)
          ssh(instances[0])
        else
          print "Couldn't find a running staging web instance"
        end
      end

      desc "SSH into the production web instance"
      task production: :environment do
        instances = get_instances_with_role("web")
        instances = filter_instances_by_dns_record(instances, "oversight.garden")
        if instances.length > 0
          update_security_group(@web_security_group)
          ssh(instances[0])
        else
          print "Couldn't find a running production web instance"
        end
      end
    end
  end
end
