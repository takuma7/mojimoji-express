
/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('index', { title: 'Express', host: host_for_client});
};
