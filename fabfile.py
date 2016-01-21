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

# install node (and ruby?) dependencies
def dependencies():
  run("cd %s && NODE_ENV=%s npm install --no-spin --no-progress" % (version_path, environment))

# create new index, switch write alias, update documents, switch read alias
def reindex():
  run("cd %s && rake elasticsearch:init index=%s" % (version_path, index_name))
  run("cd %s && rake elasticsearch:alias_write index=%s" % (version_path, index_name))
  run("cd %s && NODE_ENV=%s tasks/inspectors.js --since=1" % (version_path, environment))
  run("cd %s && rake elasticsearch:alias_read index=%s" % (version_path, index_name))

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
  run("cd %s && rake elasticsearch:list" % current_path)

def delete_index(index):
  run("cd %s && rake elasticsearch:delete index=%s" % (current_path, index))

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
