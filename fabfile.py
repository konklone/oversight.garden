import time

import boto3
from fabric import task
import yaml

config = yaml.load(open("config/config.yaml"))

ec2 = boto3.resource("ec2", region_name=config["aws"]["region"])
web_instances = ec2.instances.filter(
  Filters=[
    {
      "Name": "tag:role",
      "Values": ["web"]
    }
  ]
)
ec2_hosts = [{"host": instance.public_dns_name, "user": "ubuntu"}
             for instance in web_instances]

branch = "master"
repo = "https://github.com/konklone/oversight.git"

environment = "production"
home = "$HOME/oversight"
logs = "$HOME/oversight"
shared_path = "%s/shared" % home
versions_path = "%s/versions" % home
now = time.strftime("%Y%m%d%H%M%S")
version_path = "%s/%s" % (versions_path, now)
current_path = "%s/current" % home
index_name = "oversight-%s" % now

# how many old releases to be kept at deploy-time
keep = 3

# can be run only as part of deploy
def checkout(c):
  c.run('git clone -q -b %s %s %s' % (branch, repo, version_path))

def links(c):
  c.run("ln -s %s/config.yaml %s/config/config.yaml" % (shared_path, version_path))

# install node and ruby dependencies
def dependencies(c):
  c.run("cd %s && export NODE_ENV=%s && export NVM_DIR=$HOME/.nvm && source $NVM_DIR/nvm.sh && npm install --no-spin --no-progress" % (version_path, environment))
  c.run("cd %s && source $HOME/.rvm/scripts/rvm && bundle install" % version_path)

# create new index, switch write alias, update documents, switch read alias
def reindex(c):
  c.run("cd %s && source $HOME/.rvm/scripts/rvm && bundle exec rake elasticsearch:init index=%s" % (version_path, index_name))
  c.run("cd %s && source $HOME/.rvm/scripts/rvm && bundle exec rake elasticsearch:alias_write index=%s" % (version_path, index_name))
  c.run("cd %s && export NODE_ENV=%s && export NVM_DIR=$HOME/.nvm && source $NVM_DIR/nvm.sh && tasks/inspectors.js --since=1" % (version_path, environment))
  c.run("cd %s && source $HOME/.rvm/scripts/rvm && bundle exec rake elasticsearch:alias_read index=%s" % (version_path, index_name))

# TODO: why cp instead of ln?
def make_current(c):
  c.run('rm -rf %s && cp -r %s %s' % (current_path, version_path, current_path))

def cleanup(c):
  versions = c.run("ls -x %s" % versions_path).stdout.split()
  # destroy all but the most recent X
  destroy = versions[:-keep]

  for version in destroy:
    command = "rm -rf %s/%s" % (versions_path, version)
    c.run(command)


## can be run on their own

@task(hosts=ec2_hosts)
def list_indices(c):
  c.run("cd %s && source $HOME/.rvm/scripts/rvm && bundle exec rake elasticsearch:list" % current_path)

@task(hosts=ec2_hosts)
def delete_index(c, index):
  c.run("cd %s && source $HOME/.rvm/scripts/rvm && bundle exec rake elasticsearch:delete index=%s" % (current_path, index))

@task(hosts=ec2_hosts)
def start(c):
  c.run("cd %s && export NODE_ENV=%s && export NVM_DIR=$HOME/.nvm && source $NVM_DIR/nvm.sh && forever -l %s/forever.log -a start app.js" % (current_path, environment, logs))

@task(hosts=ec2_hosts)
def stop(c):
  c.run("cd %s && export NODE_ENV=%s && export NVM_DIR=$HOME/.nvm && source $NVM_DIR/nvm.sh && forever stop app.js" % environment)

@task(hosts=ec2_hosts)
def restart(c):
  c.run("cd %s && export NODE_ENV=%s && export NVM_DIR=$HOME/.nvm && source $NVM_DIR/nvm.sh && forever restart app.js" % (current_path, environment))

@task(hosts=ec2_hosts)
def deploy(c):
  checkout(c)
  links(c)
  dependencies(c)
  make_current(c)
  restart(c)
  cleanup(c)

@task(hosts=ec2_hosts)
def deploy_reindex(c):
  checkout(c)
  links(c)
  dependencies(c)
  reindex(c)
  make_current(c)
  restart(c)
  cleanup(c)

@task(hosts=ec2_hosts)
def deploy_cold(c):
  checkout(c)
  links(c)
  dependencies(c)
  make_current(c)
  start(c)

@task(hosts=ec2_hosts)
def deploy_cold_reindex(c):
  checkout(c)
  links(c)
  dependencies(c)
  reindex(c)
  make_current(c)
  start(c)
