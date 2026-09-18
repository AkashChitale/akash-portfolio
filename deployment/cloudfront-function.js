// Attach to CloudFront's viewer-request event (runtime cloudfront-js-2.0).
// S3 REST origins do not resolve directory indexes themselves.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function handler(event) {
  var request = event.request;
  var uri = request.uri;
  if (uri.endsWith("/")) request.uri += "index.html";
  else if (!uri.substring(uri.lastIndexOf("/") + 1).includes("."))
    request.uri += "/index.html";
  return request;
}
