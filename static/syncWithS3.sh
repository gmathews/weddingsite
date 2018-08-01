#! /bin/sh

aws s3 sync . s3://teamhangloosegetsmarried.com --dryrun --exclude ".*" --exclude "*.sh"
read -p "Are you sure? " -n 1 -r
echo    # (optional) move to a new line
if [[ $REPLY =~ ^[Yy]$ ]]
then
    aws s3 sync . s3://teamhangloosegetsmarried.com --exclude ".*" --exclude "*.sh"
fi
