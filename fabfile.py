import boto3
import time
import yaml
from fabric.api import run, execute, env

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
env.hosts = [instance.public_dns_name for instance in web_instances]
env.user = "ubuntu"

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
def checkout():
  run('git clone -q -b %s %s %s' % (branch, repo, version_path))

def links():
  run("ln -s %s/config.yaml %s/config/config.yaml" % (shared_path, version_path))

# install node and ruby dependencies
def dependencies():
  run("cd %s && export NODE_ENV=%s && export NVM_DIR=$HOME/.nvm && source $NVM_DIR/nvm.sh && npm install --no-spin --no-progress" % (version_path, environment))
  run("cd %s && source $HOME/.rvm/scripts/rvm && bundle install" % version_path)

# create new index, switch write alias, update documents, switch read alias
def reindex():
  run("cd %s && source $HOME/.rvm/scripts/rvm && rake elasticsearch:init index=%s" % (version_path, index_name))
  run("cd %s && source $HOME/.rvm/scripts/rvm && rake elasticsearch:alias_write index=%s" % (version_path, index_name))
  run("cd %s && export NODE_ENV=%s && export NVM_DIR=$HOME/.nvm && source $NVM_DIR/nvm.sh && tasks/inspectors.js --since=1" % (version_path, environment))
  run("cd %s && source $HOME/.rvm/scripts/rvm && rake elasticsearch:alias_read index=%s" % (version_path, index_name))

# TODO: why cp instead of ln?
def make_current():
  run('rm -rf %s && cp -r %s %s' % (current_path, version_path, current_path))

def cleanup():
  versions = run("ls -x %s" % versions_path).split()
  # destroy all but the most recent X
  destroy = versions[:-keep]

  for version in destroy:
    command = "rm -rf %s/%s" % (versions_path, version)
    run(command)


## can be run on their own

def list_indices():
  run("cd %s && source $HOME/.rvm/scripts/rvm && rake elasticsearch:list" % current_path)

def delete_index(index):
  run("cd %s && source $HOME/.rvm/scripts/rvm && rake elasticsearch:delete index=%s" % (current_path, index))

def start():
  run("cd %s && export NODE_ENV=%s && export NVM_DIR=$HOME/.nvm && source $NVM_DIR/nvm.sh && forever -l %s/forever.log -a start app.js" % (current_path, environment, logs))

def stop():
  run("cd %s && export NODE_ENV=%s && export NVM_DIR=$HOME/.nvm && source $NVM_DIR/nvm.sh && forever stop app.js" % environment)

def restart():
  run("cd %s && export NODE_ENV=%s && export NVM_DIR=$HOME/.nvm && source $NVM_DIR/nvm.sh && forever restart app.js" % (current_path, environment))

def deploy():
  execute(checkout)
  execute(links)
  execute(dependencies)
  execute(make_current)
  execute(restart)
  execute(cleanup)

def deploy_reindex():
  execute(checkout)
  execute(links)
  execute(dependencies)
  execute(reindex)
  execute(make_current)
  execute(restart)
  execute(cleanup)

def deploy_cold():
  execute(checkout)
  execute(links)
  execute(dependencies)
  execute(make_current)
  execute(start)

def deploy_cold_reindex():
  execute(checkout)
  execute(links)
  execute(dependencies)
  execute(reindex)
  execute(make_current)
  execute(start)
