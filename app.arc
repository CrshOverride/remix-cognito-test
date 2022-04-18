@app
remix-architect-app

@aws
policies
  architect-default-policies
  AmazonCognitoPowerUser

@plugins
cognito

@http
/*
  method any
  src server

@static

@cognito
AllowAdminCreateUserOnly false
UsernameCaseSensitive false
StandardAttributes email
RecoveryOptions verified_email
AutoVerifiedAttributes email
CustomAttributes:advertiserId String 1 100 true

# @aws
# profile default
# region us-west-1
