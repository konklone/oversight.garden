require 'aws-sdk'

namespace :aws do
  region = 'us-east-1'
  availability_zone = 'us-east-1b'
  key_name = 'erickey'
  security_group_ids = ['sg-21433658']
  instance_type = 't2.small'
  iam_instance_profile = 'arn:aws:iam::786276019377:instance-profile/oversight'
  device_name = '/dev/xvdf'

  # Ubuntu Server 14.04 LTS (HVM), instance store, 20160627
  ami = 'ami-fc42fbeb'

  s3 = Aws::S3::Resource.new(region: region)

  desc "Create scraper instance"
  task create_scraper_instance: :environment do
    if ec2.instances({filters: [{name: "tag:role", values: ["scraper"]}]}).count > 0 then
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
      key_name: erickey,
      security_group_ids: security_group_ids,
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
        arn: iam_instance_profile
      }
    })
    puts "Created instance #{instance.id}"

    instance.create_tags({
      tags: [{
        key: 'role',
        value: 'scraper'
      }]
    })

    volume.attach_to_instance({instance_id: instance.id, device: device_name})
    puts "Attached volume to instance"

    puts "Waiting for instance to start"
    ec2.client.wait_until(:instance_status_ok, instance_id: instance.id)
    puts "Instance #{instance.id} is running at #{instance.public_ip_address}"
  end
end
