require 'csv'
require 'net/http'
require 'net/https'

def find_ami(release, region, virtualization, disk)
  http = Net::HTTP.new("cloud-images.ubuntu.com", 443)
  http.use_ssl = true
  http.verify_mode = OpenSSL::SSL::VERIFY_PEER

  request = Net::HTTP::Get.new("/query/#{release}/server/released.current.txt")
  response = http.request(request)

  amis = CSV.parse(response.body, {col_sep: "\t"})
  # Fields: <suite>  <build_name> <label> <serial>    <root-store>   <arch> <region>  <ami>         <aki>        <ari>
  matches = amis.select{ |row|
    (row[4] == disk) && (row[6] == region) && (row[10] == virtualization)
  }
  if matches.length == 0 then
    throw "Did not find any matching AMIs"
  elsif matches.length > 1 then
    throw "Found too many (#{matches.length}) matching AMIs"
  else
    matches[0][7]
  end
end
