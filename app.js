/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const express = require("express");
const app = express();
const { Course, User, Chapter, Page } = require("./models");
var csrf = require("tiny-csrf");
const bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
const path = require("path");
const passport = require("passport");
const connectEnsureLogin = require("connect-ensure-login");
const session = require("express-session");
const LocalStrategy = require("passport-local");
const bcrypt = require("bcrypt");
const flash = require("connect-flash");
const { count } = require("console");
const saltRounds = 10;
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser("shh! some secret string"));
app.use(csrf("this_should_be_32_character_long", ["POST", "PUT", "DELETE"]));
app.use(flash());

app.use(
  session({
    secret: "my-super-secret-key-7218728182782818218782718",
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
    },
  }),
);
app.use(passport.initialize());
app.use(passport.session());
app.use(function (request, response, next) {
  response.locals.messages = request.flash();
  next();
});

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    function (username, password, done) {
      User.findOne({ where: { email: username } })
        .then(async function (user) {
          if (user) {
            const resultantPass = await bcrypt.compare(password, user.password);
            if (resultantPass) {
              return done(null, user);
            } else {
              return done(null, false, { message: "Invalid Password" });
            }
          } else {
            return done(null, false, { message: "User Does Not Exist" });
          }
        })
        .catch((error) => {
          return done(error);
        });
    },
  ),
);

passport.serializeUser((user, done) => {
  console.log("Serializing user in session: ", user.id);
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findByPk(id)
    .then((user) => {
      done(null, user);
    })
    .catch((error) => {
      done(error, null);
    });
});

app.get("/login", (request, reponse) => {
  reponse.render("login", { title: "Login", csrfToken: request.csrfToken() });
});

app.post(
  "/session",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  function (request, response) {
    console.log(request.user.role);
    response.redirect("/home");
  },
);

app.get("/signout", (request, response) => {
  request.logout((err) => {
    if (err) {
      return next(err);
    }
    response.redirect("/");
  });
});

app.get("/signup", (request, response) => {
  response.render("signup", {
    title: "Signup",
    csrfToken: request.csrfToken(),
  });
});

// users
app.post("/users", async (request, response) => {
  const { email, firstName, lastName, password } = request.body;
  if (email.length === 0) {
    request.flash("error", "Email can not be empty!");
    return response.redirect("/signup");
  }

  if (firstName.length === 0) {
    request.flash("error", "First name cannot be empty!");
    return response.redirect("/signup");
  }

  if (lastName.length === 0) {
    request.flash("error", "Last name cannot be empty!");
    return response.redirect("/signup");
  }

  if (password.length < 8) {
    request.flash("error", "Password must be at least 8 characters");
    return response.redirect("/signup");
  }
  const submitValue = request.body.submit;
  const hashedPwd = await bcrypt.hash(request.body.password, saltRounds);
  console.log(hashedPwd);
  console.log(request.body);
  try {
    if (submitValue === "educator") {
      console.log(submitValue);

      const educator = await User.create({
        firstName: request.body.firstName,
        lastName: request.body.lastName,
        email: request.body.email,
        password: hashedPwd,
        role: "educator",
      });
      request.login(educator, (err) => {
        if (err) {
          console.log(err);
        }
        response.redirect("/home");
      });
    } else if (submitValue === "student") {
      console.log(submitValue);
      const student = await User.create({
        firstName: request.body.firstName,
        lastName: request.body.lastName,
        email: request.body.email,
        password: hashedPwd,
        role: "student",
      });
      request.login(student, (err) => {
        if (err) {
          console.log(err);
        }
        response.redirect("/home");
      });
    } else {
      console.log("Invalid submit button");
    }
  } catch (error) {
    request.flash("error", "This mail already existes,try using a new mail");
    console.log(error);
    return response.redirect("/signup");
  }
});

app.get("/", async (request, response) => {
  if (request.isAuthenticated()) {
    response.redirect("/home");
  } else {
    // Render a login page or any other appropriate content for non-logged-in users
    response.render("index", {
      title: "LMS Application",
      csrfToken: request.csrfToken(),
    });
  }
});

app.get(
  "/home",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const firstName = request.user.firstName;
    const lastName = request.user.lastName;
    const course = await Course.findAll();
    const chapter = await Chapter.findAll();
    const role = request.user.role;
    try {
      if (request.accepts("html")) {
        response.render("home", {
          firstName,
          lastName,
          role,
          course,
          chapter,
          csrfToken: request.csrfToken(),
        });
      }
    } catch (error) {
      console.log(error);
      response.status(500).json({ message: "Internal Server Error" });
    }
  },
);

//

app.get(
  "/createCourse",
  connectEnsureLogin.ensureLoggedIn(),
  (request, response) => {
    response.render("createCourse", {
      title: "Create Course",
      csrfToken: request.csrfToken(),
    });
  },
);

app.post(
  `/createCourse`,
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const role = request.user.role;
    try {
      const userId = request.user.id;
      const firstName = request.user.firstName;
      const lastName = request.user.lastName;
      const educatorName = firstName + " " + lastName;
      const createdCourse = await Course.create({
        title: request.body.title,
        educatorName,
        userId,
      });

      response.redirect(`/viewCourse/${createdCourse.id}`);
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  },
);

app.get(
  `/viewCourse/:id`,
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const courseId = request.params.id;
    const role = request.user.role;

    try {
      const course = await Course.findOne({ where: { id: courseId } });
      const chapter = await Chapter.findAll();

      if (!course) {
        response.status(404).json({ message: "Course not found" });
        return;
      }

      if (request.accepts("html")) {
        response.render("viewCourse", {
          role: role,
          course: course,
          chapter: chapter,
          csrfToken: request.csrfToken(),
        });
      }
    } catch (error) {
      console.log(error);
      response.status(500).json({ message: "Internal Server Error" });
    }
  },
);

app.get(
  "/course/:id/createChapter",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const courseId = request.params.id;
    try {
      const course = await Course.findOne({ where: { id: courseId } });
      const chapter = await Chapter.findAll({ where: { courseId: courseId } });

      if (!course) {
        response.status(404).json({ message: "Course not found" });
        return;
      }

      if (request.accepts("html")) {
        response.render("createChapter", {
          course: course,
          chapter: chapter, // Pass chapters instead of chapter
          csrfToken: request.csrfToken(),
        });
      }
    } catch (error) {
      console.error(error); // Use console.error for error logging
      response.status(500).json({ message: "Internal Server Error" });
    }
  },
);

app.post(
  "/createChapter",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const { title, description } = request.body;

    try {
      const newChapter = await Chapter.create({
        title: title,
        description: description,
      });
      response.redirect(`/viewChapter/${newChapter.id}`); // Redirect to the course page after creating the chapter
    } catch (error) {
      console.error(error);
      response.status(500).json({ message: "Internal Server Error" });
    }
  },
);

app.get(
  "/changePassword",
  connectEnsureLogin.ensureLoggedIn(),
  (request, response) => {
    response.render("changePassword", {
      title: "Change Password",
      csrfToken: request.csrfToken(),
    });
  },
);

app.post(
  "/changePassword",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const userId = request.user.id;
    const newPassword = request.body.password;
    try {
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      await User.update(
        { password: hashedPassword },
        { where: { id: userId } },
      );
      response.redirect("/home");
    } catch (error) {
      console.error(error);
      response.status(500).json({ message: "Internal Server Error" });
    }
  },
);

module.exports = app;
