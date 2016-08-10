require 'aws-sdk'

namespace :aws do
  region = 'us-east-1'
  availability_zone = 'us-east-1b'
  key_name = 'erickey'
  instance_type = 't2.small'
  scraper_iam_instance_profile = 'arn:aws:iam::786276019377:instance-profile/oversight'
  web_iam_instance_profile = 'arn:aws:iam::786276019377:instance-profile/oversight-web'
  device_name = '/dev/xvdf'
  subnet = 'subnet-ae40b184'

  # Ubuntu Server 16.04 LTS (HVM), EBS-backed, 20160627
  ami = 'ami-ddf13fb0'

  ec2 = Aws::EC2::Resource.new(region: region)
  autoscaling = Aws::AutoScaling::Resource.new(region: region)

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
      image_id: ami,
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
      image_id: ami,
      key_name: key_name,
      security_groups: ["web-sg"],
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
  end
end
