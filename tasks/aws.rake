require 'aws-sdk'
require 'net/http'
require 'net/https'
require_relative 'ubuntu_cloud_images'

class HTTPWithIP < Net::HTTP
  def ip_address
    io = @socket
    while defined? io.io
      io = io.io
    end
    io.peeraddr[3]
  end
end

namespace :aws do
  region = 'us-east-1'
  availability_zone = 'us-east-1b'
  key_name = 'erickey'
  instance_type = 't2.small'
  scraper_iam_instance_profile = 'arn:aws:iam::786276019377:instance-profile/oversight'
  web_iam_instance_profile = 'arn:aws:iam::786276019377:instance-profile/oversight-web'
  device_name = '/dev/xvdf'
  subnet = 'subnet-ae40b184'
  web_security_group = 'sg-72ba4108'
  route53_zone = 'Z373JK35FYSEGP'

  ami_release = 'xenial'
  ami_virtualization = 'hvm'
  ami_disk = 'ebs-ssd'

  ec2 = Aws::EC2::Resource.new(region: region)
  autoscaling = Aws::AutoScaling::Resource.new(region: region)
  route53 = Aws::Route53::Client.new(region: region)

  desc "List running EC2 instances"
  task list_instances: :environment do
    ec2.instances.each do |instance|
      if instance.state.name == "running"
        role = ""
        instance.tags.each do |tag|
          if tag.key == "role"
            role = tag.value
          end
        end
        puts "#{role}\t#{instance.public_ip_address}\t#{instance.public_dns_name}\t#{instance.id}"
      end
    end
  end

  desc "Create scraper instance"
  task create_scraper_instance: :environment do
    if ec2.instances({filters: [
      {name: "tag:role", values: ["scraper"]},
      {name: "instance-state-name", values: ["pending", "running", "shutting-down", "stopping", "stopped"]}
    ]}).count > 0 then
      raise "There is already a scraper instance, bailing out"
    end

    volumes = ec2.volumes({filters: [{name: "tag:role", values: ["scraper"]}]})
    if volumes.count != 1 then
      raise "Expected one scraper volume but found #{volumes.count}"
    end
    volume = volumes.entries[0]
    if volume.attachments.length > 0 then
      raise "Scraper volume is already attached to an instance"
    end

    script = File.read('tasks/scraper_user_data')
    instance = ec2.create_instances({
      image_id: find_ami(ami_release, region, ami_virtualization, ami_disk),
      min_count: 1,
      max_count: 1,
      key_name: key_name,
      user_data: Base64.encode64(script),
      instance_type: instance_type,
      placement: {
        availability_zone: availability_zone
      },
      network_interfaces: [{
        device_index: 0,
        associate_public_ip_address: true
      }],
      iam_instance_profile: {
        arn: scraper_iam_instance_profile
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
    ec2.client.wait_until(:instance_status_ok, {instance_ids: [instance[0].id]})

    volume.attach_to_instance({instance_id: instance[0].id, device: device_name})
    puts "Attached volume to instance"

    route53.change_resource_record_sets({
      hosted_zone_id: route53_zone,
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
                  value: instance[0].public_ip_address
                }
              ]
            }
          }
        ]
      }
    })

    puts "DNS record for scrapers.oversight.garden updated"

    instance2 = ec2.instances({instance_ids: [instance[0].id]})
    puts "Instance #{instance2.entries[0].id} is running at #{instance2.entries[0].public_dns_name}, #{instance2.entries[0].public_ip_address}"
  end

  desc "Create web tier auto-scaling group"
  task create_web_asg: :environment do
    script = File.read('tasks/web_user_data')

    time = DateTime.now
    lc_name = time.strftime('web-config-%Y%m%d-%H%M%S')
    asg_name = time.strftime('web-asg-%Y%m%d-%H%M%S')

    launch_config = autoscaling.create_launch_configuration({
      launch_configuration_name: lc_name,
      image_id: find_ami(ami_release, region, ami_virtualization, ami_disk),
      key_name: key_name,
      security_groups: [web_security_group],
      user_data: Base64.encode64(script),
      instance_type: instance_type,
      iam_instance_profile: web_iam_instance_profile,
      associate_public_ip_address: true
    })
    puts "Created launch configuration #{lc_name}"

    group = autoscaling.create_group({
      auto_scaling_group_name: asg_name,
      launch_configuration_name: lc_name,
      min_size: 1,
      max_size: 1,
      availability_zones: [availability_zone],
      health_check_type: "EC2",
      health_check_grace_period: 60,
      vpc_zone_identifier: subnet,
      tags: [
        key: 'role',
        value: 'web',
        propagate_at_launch: true
      ]
    })
    puts "Created autoscaling group #{asg_name}"

    sleep 15

    puts "Waiting for autoscaling group to be in service"
    group.wait_until_in_service

    instance = ec2.instances({instance_ids: [group.instances[0].instance_id]})
    puts "Instance #{instance.entries[0].id} is running at #{instance.entries[0].public_dns_name}, #{instance.entries[0].public_ip_address}"

    route53.change_resource_record_sets({
      hosted_zone_id: route53_zone,
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
                  value: instance.entries[0].public_ip_address
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
                  value: instance.entries[0].public_ip_address
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

    staging_ip = route53.test_dns_answer({
      hosted_zone_id: route53_zone,
      record_name: "staging.oversight.garden",
      record_type: "A",
    }).record_data[0]
    main_ip = route53.test_dns_answer({
      hosted_zone_id: route53_zone,
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

    route53.change_resource_record_sets({
      hosted_zone_id: route53_zone,
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
              name: "www.oversight.garden",
              type: "A",
              ttl: 300,
              resource_records: [
                {
                  value: staging_ip
                }
              ]
            }
          }
        ]
      }
    })

    puts "DNS record for oversight.garden updated"
  end
end
