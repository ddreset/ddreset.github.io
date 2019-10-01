---
layout: post
title:  "Make SSL Certificate for AWS S3 Website with Let's Encrypt and Auto Renew It"
date:   2019-07-26 21:17:00 +0300
categories: [SoftwareDev]
tags: [Administration] 
intro: This tutorial is for people who are not familiar with AWS and how SSL certificates work. 
---
This tutorial is for people who are not familiar with AWS and how SSL certificates work. 
## MY GOAL:
- Make a static website
- Add HTTPS to the website
- Make future updating as simple as possible for everyone

## WHAT I HAVE NOW:
- An AWS account including an EC2 server
- A domain register account

## WHAT I USE AND WHY:
1. AWS IAM: allow access to AWS services from server
2. AWS CLI: manage AWS services from server
3. AWS S3: store website files, and future updating will be done through this service
4. AWS CloudFront: redirect HTTP to HTTPS
5. AWS Certificate Manager: maintain SSL certificate for CloudFront
6. A server (e.g. AWS EC2 ) or your computer: make SSL certificate and auto renew it
7. A domain register (e.g. goDaddy and Name.com): manage custom domains and point your domains to CloudFront
8. A certificate authority (I used Let’s Encrypt because it’s free, but it expires every 90 days so auto-renewing is needed)

## STEP 1: make a static website with AWS S3
AWS has already given a detailed example: [Example: Setting up a Static Website](https://docs.aws.amazon.com/AmazonS3/latest/dev/HostingWebsiteOnS3Setup.html)

__NOTE:__  public access is needed for visiting your website and HTTP-01 challenge. So while creating the bucket, you should uncheck “block all public access”. After creating, you can still change this setting under Permissions tab.

After testing your website, you can move on to the next step.

## STEP 2: point your domain to the website
Log in your domain register and go to DNS records. 

Add a CNAME record, such as:

| Type        | Host        | Answer      | TTL         |
| :----: | :----: | :----: | :----: |
| CNAME | custom domain | S3 Endpoint of your website | Default number|

Now you should be able to visit your static website through this custom domain.

You could also create a CNAME record for www subdomain and point it to the bare domain.

## STEP 3: make a SSL certificate for this domain by HTTP-01 challenge
1. Download Let’s Encrypt tool (it’s called Certbot now) on your server/computer:
```
git clone https://github.com/certbot/certbot
```
<br>
2. I use HTTP-01 challenge and manual mode here. This means I need to put a specific validation file into my website under a specific path (/.well-known/acme-challenge/), and Certbot will try to visit this validation file (http://domain/.well-known/acme-challenge/validation_file). In this way I prove that I own this domain.
__NOTE:__ DNS challenge means I add a TXT record in my DNS records to validate. Considering I’m already using AWS CLI to manage my AWS services, HTTP challenge is easier for me to do auto-renewing. But you could also use DNS challenge!
__NOTE:__ I installed certbot-auto. Other versions work too.
__NOTE:__ I had to set my locale as en_US.UTF-8 to make it work: 
```
    export LC_ALL="en_US.UTF-8”
```
Below is an example command. A certificate can cover multiple domains, so here I put www domain and bare domain together.
```
    certbot/certbot-auto certonly -d example.com -d www.example.com --manual --preferred-challenges=http
```
<br>
3. If succeed, it will tell you where those SSL certificate files are. In my case, it’s under /etc/letsencrypt/live/www.example.com-0001/.You could list and read them:
```
    ls /etc/letsencrypt/live/www.example.com-0001/       
    cat /etc/letsencrypt/live/www.example.com-0001/cert.pem
```

## STEP 4: import your certificate into AWS Certificate Manager
Open Certificate Manager on AWS. If you haven’t used this service before, click Get Started under Provision Certificates.

__NOTE:__ make sure you are under us-east-1 region, otherwise you cannot choose your custom certificate in CloudFront.

Choose “Import a certificate”. Copy and paste your cert.pem into “certificate body”, privkey.pem into “certificate private key” and chain.pem into “certificate chain”, then click “Review and Import”. If succeed, its status is “Issued”.

Click on this certificate, and find its ARN for later use.

## STEP 5: create an AWS CloudFront distribution
Go to CloudFront and create a distribution. Here are the necessary settings:

- Original Domain Name: your S3 endpoint
- Viewer Protocol Policy: HTTP and HTTPS / Redirect HTTP to HTTPS
- Alternate Domain Names (CNAMEs): example.com,www.example.com
- SSL Certificate: Custom SSL Certificate: choose the certificate you imported before

In my case, it takes around 30 minutes to take effect.

You can have a break:)

After its status turns to “Deployed”, you would be able to visit your website through its domain name which can be found under its General tab.

## STEP 6: point your domain to the CF distribution
In your domain register, edit those CNAME records you add before. And change it’s Target/Answer/… to your CF’s domain name.

Now you should be able to visit your website through https://example.com and https://www.example.com

## STEP 7: create a group/user with limited permissions and install AWS CLI
As you can see, we did almost everything through AWS console. However, we do not want to do it by ourselves every 2 or 3 months.That’s why we need AWS CLI to manage AWS services. Therefore, our machine can renew it automatically.

First of all, we create a group/user with limited permissions:

- S3FullAccess -- to upload validation files for SSL certificates
- CertificateManagerFullAccess -- to import SSL certificates into Certificate Manager

__NOTE:__ for security it’s recommended to give only necessary permissions to this group/user.

Remember your Access ID and Secret Key. You could download them in case you need it in the future.

Then we install AWS CLI: [Install the AWS CLI on Linux](https://docs.aws.amazon.com/cli/latest/userguide/install-linux.html)

## STEP 8: write a renew shell script and run it regularly by cron
On your server/computer open a new file: 
```
    nano autoRenewSSL.sh
```

__NOTE:__ no matter where you put this shell script, make sure it can run regularly, like weekly or monthly, before your certificate expires.

Write below content into it:

```
    #!/bin/bash
    # renew ssl certificate for frontend projects on aws
    # this renewal needs to be done before certificate expires otherwise this will not work!
    certbot/certbot-auto certonly -d examplecom -d www.example.com --force-renewal --preferred-challenges=http --manual-auth-hook /home/ubuntu/authenticator.sh --manual-cleanup-hook /home/ubuntu/cleanup.sh

    # AWS Config - recommend using IAM specific user/group with limited permissions!
    # could also be configured by aws configure
    export AWS_ACCESS_KEY_ID=[your access id]
    export AWS_SECRET_ACCESS_KEY=[your secret key]

    # path to ssl files
    frontendSSL=/etc/letsencrypt/live/example.com-0001

    arn=[the arn we get from AWS Certificate Manager]

    # AWS CLI - this certificate was imported in AWS Certificate Manager before
    # to keep it simple, we only need to reimport it
    # so arn needs to be specified
    sudo aws acm import-certificate --certificate-arn $arn --region us-east-1 --certificate file://$frontendSSL/cert.pem --private-key file://$frontendSSL/privkey.pem --certificate-chain file://$frontendSSL/fullchain.pem
```

You may notice “authenticator.sh” and “cleanup.sh” in the above script. They apply the operations before and after validation for us, so we do not need to upload and delete validation files by ourselves. For more information: [Pre and Post Validation Hooks](https://certbot.eff.org/docs/using.html#pre-and-post-validation-hooks)

Let’s write them: 
```
    nano authenticator.sh
```

```
    #!/bin/bash
    if [ ! -z "$CERTBOT_VALIDATION" ]
        then
         export AWS_ACCESS_KEY_ID=
         export AWS_SECRET_ACCESS_KEY=
         # make validation file
         echo $CERTBOT_VALIDATION > ~/$CERTBOT_TOKEN
         # upload validation file to S3
         aws s3 cp ~/$CERTBOT_TOKEN s3://example.com/.well-known/acme-challenge/
    Fi
```

```
    nano cleanup.sh
```
```
    #!/bin/bash
    rm -f ~/$CERTBOT_TOKEN
    aws s3 rm s3://example.com/.well-known/acme-challenge/$CERTBOT_TOKEN
```

Then make them executable:
```
    chmod +x authenticator.sh
    chmod +x cleanup.sh
```

Open cron:
```
    crontab -e
```

Write below command into cron:
```
    # run at 00:00 on the first day of every month
    0 0 1 * * ~/autoRenewSSL.sh
```

More information about cron: [https://crontab.guru/](https://crontab.guru/)

### References:
[Hosting a HTTPS static websites using S3 and Lets Encrypt](https://medium.com/@deepak13245/hosting-a-https-static-websites-using-s3-and-lets-encrypt-6f3e53014ff2 )

[Let’s Encrypt: Integrating Certificate Auto-renewal with AWS CloudFront](https://taylor.callsen.me/lets-encrypt-integrating-certificate-auto-renewal-with-aws-cloudfront/)

