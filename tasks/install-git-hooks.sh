#!/bin/sh

HOOKS=$(git rev-parse --show-toplevel)/.git/hooks
TASKS=$(git rev-parse --show-toplevel)/tasks

if [ ! -x "$(command -v ruby)" ]
then
    echo Warning: ruby was not found on the PATH. You will need to install ruby before running syntax checks.
fi

if [ ! -x "$(command -v node)" ]
then
    echo Warning: node was not found on the PATH. You will need to install node before running syntax checks.
fi

if [ ! -f $HOOKS/pre-commit ]
then
    ln -s $TASKS/pre-commit $HOOKS/pre-commit
    echo The pre-commit hook was successfully installed to $HOOKS/pre-commit.
    exit 0
else
    echo Error: $HOOKS/pre-commit already exists. The hook was not installed.
    exit 1
fi
