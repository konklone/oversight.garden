#!/bin/bash

cd $HOME/inspectors-general
source $HOME/.virtualenvs/inspectors/bin/activate

# get latest IG reports from all 'safe' scrapers
./igs --safe > $HOME/oversight/shared/log/igs-cron.log 2>&1

# load them into elasticsearch
# cd $HOME/oversight/current
