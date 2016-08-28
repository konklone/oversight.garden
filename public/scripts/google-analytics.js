window.ga = function() {
  window.ga.q.push(arguments);
};
window.ga.q = [];
window.ga.l = 1 * new Date();

ga('create', 'UA-252618-18', 'oversight.garden');

// Anonymize user IPs (cut off the last octet).
ga('set', 'anonymizeIp', true);
ga('set', 'forceSSL', true);

ga('send', 'pageview');
