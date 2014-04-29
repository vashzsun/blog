var crypto = require('crypto'),
	User = require('../models/user.js'),
	Post = require('../models/post.js'),
	fs = require('fs');

function checkLogin(req, res, next){
	if (!req.session.user){
		req.flash('error','Please Login');
		res.redirect('/login');
	};
	next();
};

function checkNotLogin(req, res, next){
	if (req.session.user){
		req.flash('error','已登录');
		res.redirect('back');
	};
	next();
};

module.exports = function(app){
	app.get('/',function(req, res){
		Post.getAll(null,function (err, posts){
			if (err) {
				posts = [];
			}
			res.render('index',{title:'Home',
			user: req.session.user,
			success: req.flash('success').toString(),
			error: req.flash('error').toString(),
			posts: posts
			});			
		});

	});

	app.get('/reg',checkNotLogin);
	app.get('/reg',function(req, res){

		res.render('reg',{title:'Register',
		user: req.session.user,
		success: req.flash('success').toString(),
		error: req.flash('error').toString()
		});
	});

	app.post('/reg',checkNotLogin);
	app.post('/reg',function (req, res){
		var name = req.body.name,
			password = req.body.password,
			password_re = req.body['password-repeat'];

		if (password_re != password){
			req.flash('error','password did not match');
			console.log('password did not match');
			return res.redirect('/reg'); 
		}
		var md5 = crypto.createHash('md5'),
			password = md5.update(req.body.password).digest('hex');
		var newUser = new User({
			name:req.body.name,
			password:password,
			email:req.body.email
		});
		User.get(newUser.name, function (err, user) {
			if (user){
				req.flash('error','User have exist.');
				console.log('User have exist');
				return res.redirect('/reg');//return reg page
			};
			newUser.save(function(err,user){
				if (err){
					req.flash('error',err);
					console.log(err);
					return res.redirect('/reg');
				};
				req.session.user =user;
				req.flash('success','Thank you.');
				console.log('Thank you.')
				res.redirect('/');
			});
		});
	});
	
	app.get('/login',checkNotLogin);
	app.get('/login',function(req, res){
		res.render('login',{title:'Login',
		user: req.session.user,
		success: req.flash('success').toString(),
		error: req.flash('error').toString()});
	});

	app.post('/login',checkNotLogin);
	app.post('/login',function(req, res){
		var md5 = crypto.createHash('md5'),
		password = md5.update(req.body.password).digest('hex');

		User.get(req.body.name,function (err,user){
			if (!user){
				req.flash ('error','user dont exist');
				return res.redirect('/login');
			};
			if(user.password != password){
				req.flash('error','password error');
				return res.redirect('/login');
			};
			req.session.user = user;
			req.flash('success','Login success');
			res.redirect('/');
		});
	});

	app.get('/post',checkLogin);
	app.get('/post',function(req, res){
		res.render('post',{title:'Post',
		user: req.session.user,
		success: req.flash('success').toString(),
		error: req.flash('error').toString()
		});
	});

	app.post('/post',checkLogin);
	app.post('/post',function(req, res){
		var currentUser = req.session.user,
		post = new Post(currentUser.name,req.body.title,req.body.post);
		post.save(function (err){
			if (err){
				req.flash('error',err);
				return res.redirect('/');
			};
			req.flash('success','Post success.');
			res.redirect('/');
		});
	});

	app.get('/logout',checkLogin);
	app.get('/logout',function(req, res){
		req.session.user = null;
		req.flash('success','退出成功');
		res.redirect ('/');
	});

	//查找单篇
	app.get('/u/:name',checkLogin);
	app.get('/u/:name',function (req,res ){
		User.get(req.params.name, function (err, user){
			if (!user){
				req.flash('error', '用户不存在!');
				return res.redirect('/')
			};
			Post.getAll(user.name, function (err, posts){
				if (err) {
					req.flash('error', err);
					return res.redirect('/');
				}
				res.render ('user', {
					title: user.name,
					posts: posts,
					user: req.session.user,
					success: req.flash('success').toString(),
					error: req.flash('error').toString()
				});
			});
		});
	});
	app.get('/u/:name/:day/:title',function (req, res){
		Post.getOne(req.params.name, req.params.day, req.params.title, function (err, post){
			if (err){
				req.flash ('error', err);
				return res.redirect('/');
			}
			res.render('article',{
				title: req.params.title,
				post: post,
				user: req.session.user,
				success: req.flash('success').toString(),
				error: req.flash('error').toString()
			});
		});
	});

	app.get('/upload', checkLogin);
	app.get('/upload', function (req, res){
		res.render('Upload', {title: '文件上传',
			user:req.session.user,
			success: req.flash('success').toString(),
			error: req.flash('error').toString()
		});
	});

	app.post('/upload', checkLogin);
	app.post('/upload', function (req, res){
		for (var i in req.files) {
			if (req.files[i].size == 0){
				fs.unlinkSync(req.files[i].path);
				console.log('removed an empty file!')
			} else {
				var target_path = './public/upload/'+req.files[i].name;
				fs.renameSync(req.files[i].path, target_path);
				console.log('Renamed a file.')
			};
		};
		req.flash ('success', 'files uploaded success');
		res.redirect ('/upload');
	});

	app.get('/edit/:name/:day/:title', checkLogin);
	app.get('/edit/:name/:day/:title', function (req, res){
		//console.log(req.body);
		var currentUser = req.session.user;
		Post.edit(req.params.name, req.params.day, req.params.title, function(err, post){
			if (err) {
				req.flash('error', err);
				return res.redirect('back');
			};
			res.render('edit',{
				title:'edit',
				post: post,
				user: currentUser,
				success: req.flash('success').toString(),
				error: req.flash('error').toString()
			})
		});
	});

	app.post('/edit/:name/:day/:title', checkLogin);
	app.post('/edit/:name/:day/:title', function (req, res){
		Post.update(req.params.name, req.params.day, req.params.title, req.body, function(err){
			var url='/u/'+req.params.name+'/'+ req.params.day+'/'+req.body.title;
			if (err) {
				req.flash('error',err);
				return res.redirect(url);
			}
			req.flash('success', 'Update finish.');
			res.redirect (url);
		});
	});

	app.get('/remove/:name/:day/:title', checkLogin);
	app.get('/remove/:name/:day/:title',function (req, res){
		var currentUser = req.session.user;
		Post.remove(currentUser.name, req.params.day, req.params.title, function (err){
			if (err){
				req.flash('error', err);
				return res.redirect('back');
			}
			req.flash('success', req.params.title+' has removed.');
			res.redirect('/');
		});
	});
}


