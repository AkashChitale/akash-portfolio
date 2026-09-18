# Static portfolio on AWS

The site is static. AWS deployment is prepared, not provisioned. Its runtime needs only S3 and CloudFront; the optional API is an independent service.

1. **Domain and certificate.** Use your domain in `SITE_URL` during the build. Request an ACM certificate for the domain and any `www` alias in **us-east-1**, which CloudFront requires. Validate domain ownership through DNS. Choose one canonical hostname and redirect the alternate.
2. **Private bucket.** Create an S3 bucket with Block Public Access enabled, bucket-owner-enforced ownership, and versioning. Use the regional S3 **REST endpoint**, not the S3 website endpoint. Create CloudFront Origin Access Control with signed requests and permit `s3:GetObject` only for the distribution ARN in the bucket policy.
3. **Distribution.** Point CloudFront at that bucket using OAC. Set the default root object to `index.html`, allow GET/HEAD (OPTIONS only if actually needed), enable compression, attach the ACM certificate and host aliases, and redirect HTTP to HTTPS. Use a current TLS policy appropriate for your browser support.
4. **Clean routes.** Attach `deployment/cloudfront-function.js` as a viewer-request function. It rewrites `/projects/elms/` to `/projects/elms/index.html` and handles extensionless routes. A CloudFront default root object does not resolve subdirectories at an S3 REST origin by itself. Do not apply an SPA fallback to every request.
5. **True 404s.** Configure 403 and 404 origin error responses to use `/404.html` and return HTTP **404**, with a short error TTL. A private S3 origin may report 403 for a missing key. Keep real missing pages as 404s, rather than serving the homepage with 200.
6. **Headers.** After the production build, generate `deployment/generated-headers.json`. Copy its values into a response headers policy and attach it to the distribution. If a Lab API is enabled, set the same public endpoint environment when generating headers. Test CSP on the deployed site. The generated global policy is suitable for the current small page set; reassess its size as articles grow.
7. **CI identity.** Add a deployment job after successful CI, gated by a protected GitHub Environment. Use GitHub OIDC to assume a narrowly scoped IAM role. Limit the trust policy to your repository, branch/environment, and `sts.amazonaws.com` audience. Grant deployment access only to this bucket and CloudFront distribution. Do not store long-lived AWS keys in GitHub or the frontend.
8. **Release assets.** Upload `dist/_astro/` first with `Cache-Control: public,max-age=31536000,immutable`. Upload HTML, `theme.js`, manifest, robots, sitemap, and favicon with `Cache-Control: public,max-age=0,must-revalidate`. Preserve content types. Retain older hashed assets for rollback and in-flight readers; do not blindly delete the bucket. Upload the HTML last so it references already-present assets.
9. **Activate.** Apply the matching CSP headers policy, create a CloudFront invalidation for changed HTML and non-hashed assets, and wait for completion. Point Route 53 A/AAAA alias records at CloudFront. Verify the canonical host over HTTPS, each case-study route, status codes, compression, cache headers, security headers, and invalid paths.
10. **Measure and maintain.** Run Lighthouse on the public HTTPS production site. Verify keyboard navigation, mobile layouts, saved themes, no-JavaScript behavior, and any configured API outage fallback. Keep the previous S3 version/release for rollback. Schedule dependency reviews; no background monitoring is configured by this repository.

Recommended deployment secrets/configuration are the AWS role ARN, bucket name, distribution ID, and canonical domain. Only `SITE_URL` and an optional **public** API URL belong in frontend build configuration. Do not put access keys or sensitive service details in `PUBLIC_` variables.

## Independent future service

```text
portfolio.your-domain.example → CloudFront → private S3
api.your-domain.example       → HTTPS endpoint → EC2 container or other compute
```

The static release must not depend on service health. The API only returns a public status document, and browser failure affects the Lab panel alone. The current repository does not provision EC2, a VPC, a load balancer, or any backend infrastructure.

## Primary references

- [CloudFront origin access control](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html)
- [CloudFront default root objects and subdirectory behavior](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DefaultRootObject.html)
- [Astro content collections](https://docs.astro.build/en/guides/content-collections/)
- [Astro styling and Tailwind integration](https://docs.astro.build/en/guides/styling/)
