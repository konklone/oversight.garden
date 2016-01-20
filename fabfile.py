import time
from fabric.api import run, execute, env

environment = "production"

env.use_ssh_config = True
env.hosts = ["unitedstates"]

branch = "master"
repo = "git@github.com:konklone/oversight.git"

username = "unitedstates"
home = "/home/unitedstates/oversight"
logs = "/home/unitedstates/oversight"
shared_path = "%s/shared" % home
versions_path = "%s/versions" % home
version_path = "%s/%s" % (versions_path, time.strftime("%Y%m%d%H%M%S"))
current_path = "%s/current" % home

# how many old releases to be kept at deploy-time
keep = 3

# can be run only as part of deploy
def checkout():
  run('git clone -q -b %s %s %s' % (branch, repo, version_path))

def links():
  run("ln -s %s/config.yaml %s/config/config.yaml" % (shared_path, version_path))

# install node (and ruby?) dependencies
def dependencies():
  run("cd %s && NODE_ENV=%s npm install --no-spin" % (version_path, environment))

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

def start():
  run("cd %s && NODE_ENV=%s forever -l %s/forever.log -a start app.js" % (current_path, environment, logs))

def stop():
  run("forever stop app.js")

def restart():
  run("forever restart app.js")

def deploy():
  execute(checkout)
  execute(links)
  execute(dependencies)
  execute(make_current)
  execute(restart)
  execute(cleanup)

def deploy_cold():
  execute(checkout)
  execute(links)
  execute(dependencies)
  execute(make_current)
  execute(start)
