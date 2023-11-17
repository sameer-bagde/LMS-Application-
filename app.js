/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const express = require("express");
const app = express();
const { Course, User, Chapter, Page, Enrollment} = require("./models");
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
const saltRounds = 10;
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser("shh! some secret string"));
app.use(csrf("this_should_be_32_character_long", ["POST", "PUT", "DELETE"]));
app.use(flash());


app.use(session({
  secret: "my-super-secret-key-721872818218782718",
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
  },
}));
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


app.get("/home", connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
  try {
    const loggedInUserId = request.user.id; // Logged-in user's ID
    const firstName = request.user.firstName;
    const lastName = request.user.lastName;
    const users = await User.findAll(); 
    const userIds = users.map((user) => user.id);
    const progressStatus = await Page.findAll();
    console.log(progressStatus);
    const course = await Course.findAll();
    const chapter = await Chapter.findAll();
    const role = request.user.role;
    const enrolledCourses = await Enrollment.findAll({ where: { userId: loggedInUserId } });
    const educatorCourses = await Course.findAll({ where: { userId: loggedInUserId } });

    if (request.accepts("html")) {
      response.render("home", {
        // Pass necessary data to the frontend
        course,
        chapter,
        role,
        firstName,
        lastName,
        user: loggedInUserId,
        educatorCourses,
        enrolledCourses,
        progressStatus,
        userIds, // Include user IDs in the data object
        csrfToken: request.csrfToken(),
      });
    }
  } catch (error) {
    console.error(error);
    response.status(500).json({ message: "Internal Server Error" });
  }
});




app.get("/educatorCourses", connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
  const user = request.user.id;
  const firstName = request.user.firstName;
  const lastName = request.user.lastName;
  const course = await Course.findAll();
  const chapter = await Chapter.findAll();
  const role = request.user.role;
  try {
      // Fetch the enrolled courses for the user
      const enrolledCourses = await Enrollment.findAll({ where: { userId: user } });
      const educatorCourses = await Course.findAll({ where: {userId: user}});
      if (request.accepts("html")) {
          response.render("educatorCourses", {
              firstName,
              lastName,
              role,
              course,
              chapter,
              user,
              educatorCourses,
              enrolledCourses,  // Include enrolledCourses in the data object
              csrfToken: request.csrfToken(),
          });
          console.log(enrolledCourses);
      }
  } catch (error) {
      console.log(error);
      response.status(500).json({ message: "Internal Server Error" });
  }
});



app.get("/enrolledCourse/:course.id", connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
  const user = request.user.id;
  const firstName = request.user.firstName;
  const lastName = request.user.lastName;
  const course = await Course.findAll();
  const chapter = await Chapter.findAll();
  const role = request.user.role;
  try {
      // Fetch the enrolled courses for the user
      const enrolledCourses = await Enrollment.findAll({ where: { userId: user } });

      if (request.accepts("html")) {
          response.render("home", {
              firstName,
              lastName,
              role,
              course,
              chapter,
              user,
              enrolledCourses,  // Include enrolledCourses in the data object
              csrfToken: request.csrfToken(),
          });
      }
  } catch (error) {
      console.log(error);
      response.status(500).json({ message: "Internal Server Error" });
  }
});


// Educator Enrollment Report Endpoint
app.get('/educatorEnrollmentReport/:educatorId', async (req, res) => {
  try {
    const educatorId = req.params.educatorId;
    // Retrieve courses associated with the educator
    const courses = await Course.findAll({ where: { userId: educatorId } });

    if (!courses || courses.length === 0) {
      return res.status(404).json({ message: 'No courses found for the educator' });
    }

    // Log the retrieved courses to check if they are obtained correctly
    console.log('Retrieved Courses:', courses);

    const enrollmentCounts = [];
    for (const course of courses) {
      const count = await Enrollment.count({ where: { courseId: course.id } });
      enrollmentCounts.push({ courseId: course.id, enrollmentCount: count });
    }

    // Log the enrollment counts to check if they are correct
    console.log('Enrollment Counts:', enrollmentCounts);

    res.json(enrollmentCounts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


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

      response.redirect(`/course/${createdCourse.id}`);
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  },
);

app.get(
  `/course/:id`,
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const courseId = request.params.id;
    const role = request.user.role;
    const userId = request.user.id; // Get the current user's ID
    const enrollments = await Enrollment.findAll({ where: { courseId: courseId, userId: userId } });
    
    try {
      const course = await Course.findOne({ where: { id: courseId } });
      const chapter = await Chapter.findAll();
 
      if (!course) {
        response.status(404).json({ message: "Course not found" });
        return;
      }

      if (request.accepts("html")) {
        response.render("course", {
          role: role,
          userId: userId, // Pass the user ID to the template
          enrollments,
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



// create chapter get render
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
          courseId,
          csrfToken: request.csrfToken(),
        });
      }
    } catch (error) {
      console.error(error); // Use console.error for error logging
      response.status(500).json({ message: "Internal Server Error" });
    }
  },
);

// create chapter post
app.post(
  "/course/:id/createChapter",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const { title, description } = request.body;
    const courseId = request.params.id;

    try {
      // Check if a chapter with the same title already exists in the course
      const existingChapter = await Chapter.findOne({ where: { title: title, courseId: courseId } });
      if (existingChapter) {
        request.flash('error', 'Chapter with the same title already exists in this course');
        response.redirect(`/course/${courseId}/createChapter`);
        return;
      }

      const newChapter = await Chapter.create({
        title: title,
        description: description,
        courseId: courseId,
      });

      response.redirect(`/course/${courseId}/chapter/${newChapter.id}`); // Redirect to the newly created chapter
    } catch (error) {
      console.error(error);
      response.status(500).json({ message: "Internal Server Error" });
    }
  }
);

// chapter get according to id
app.get(
  `/course/:courseId/chapter/:chapterId`,
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const { title, content } = request.body;

    const courseId = request.params.courseId;
    const chapterId = request.params.chapterId;
    const role = request.user.role;

    try {
      const course = await Course.findByPk(courseId);
      const chapter = await Chapter.findByPk(chapterId);
      const page = await Page.findAll();

      if (!course) {
        response.status(404).json({ message: "Course not found" });
        return;
      } else if (!chapter) {
        response.status(404).json({ message: "Chapter not found" });
        return;
      }

      if (request.accepts("html")) {
        response.render("chapter", {
          title:title,
          role: role,
          course: course,
          content:content,
          chapter: chapter,
          page: page, // Add this line to pass the 'page' variable
          csrfToken: request.csrfToken(),
        });
      }
    } catch (error) {
      console.log(error);
      response.status(500).json({ message: "Internal Server Error" });
    }
  },
);
// chapter get according to id


// delete chapter
app.delete('/chapter/:chapterId', connectEnsureLogin.ensureLoggedIn(),
async (request, response) => {
  try {
    const {
      chapterId
    } = request.params;

    const chapter = await Chapter.findByPk(chapterId);
    if (!chapter) {
      return response.status(404).json({
        message: 'Chapter not found'
      });
    }

    await chapter.destroy();
    return response.json({
      message: 'Chapter deleted successfully'
    });
  } catch (error) {
    console.log(error);
    return response.status(500).json({
      message: 'Internal Server Error'
    });
  }
});

// delete chapter

// create page render
app.get('/course/:courseId/chapter/:chapterId/createPage', connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
  const chapterId = request.params.chapterId;
  const courseId = request.params.courseId; // Corrected parameter name
  
const { title, content} = request.body;
  try {
    const chapter = await Chapter.findOne({ where: { id: chapterId } }); // Corrected where clause
    const course = await Course.findOne({ where: { id: courseId } });

    if (!chapter) {
      response.status(404).json({ message: "Chapter not found" }); // Updated error message
      return;
    }

    if (request.accepts("html")) {
      response.render("createPage", {
        chapter: chapter,
        course: course,
        chapterId: chapterId, // Added chapterId to the object
        csrfToken: request.csrfToken(),
      });
    }
  } catch (error) {
    console.error(error);
    response.status(500).json({ message: "Internal Server Error" });
  }
});

// post for create page
app.post(
  "/course/:courseId/chapter/:chapterId/createPage",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    // Extracting data from the request body and URL parameters
    const { title, content } = request.body;
    const courseId = request.params.courseId;
    const chapterId = request.params.chapterId;

    try {
      // Fetch the course and chapter based on the provided IDs
      const course = await Course.findOne({ where: { id: courseId } });
      const chapter = await Chapter.findOne({ where: { id: chapterId } });

      // Fetch existing pages for the chapter (if needed for rendering)
      const pages = await Page.findAll({ where: { chapterId: chapterId } });

      // Check if the chapter and course exist
      if (!chapter) {
        response.status(404).json({ message: "Chapter not found" });
        return;
      } else if (!course) {
        response.status(404).json({ message: "Course not found" });
        return;
      }

      // Check if a page with the same title already exists (if needed)
      const existingpage = await Page.findOne({ where: { title: title, chapterId: chapterId } });
      if (existingpage) {
        request.flash('error', 'Page with the same title already exists in this chapter');
        response.redirect(`/course/${courseId}/chapter/${chapterId}/createpage`);
        return;
      }
      const newPage = await Page.create({
        title: title,
        content: content,
        chapterId: chapterId,
        isComplete: false, 
        courseId: courseId,
      });

      response.redirect(`/course/${courseId}/chapter/${chapterId}/page/${newPage.id}`);
    } catch (error) {
      console.error(error);
      response.status(500).json({ message: "Internal Server Error" });
    }
  }
);


app.get(
  `/course/:courseId/chapter/:chapterId/page/:pageId`,
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const { title, content } = request.params; // Use params for route parameters
    const user = request.user; 
    const courseId = request.params.courseId;
    const chapterId = request.params.chapterId;
    const pageId = request.params.pageId; // Added pageId
    const role = request.user.role;
    try {
      const course = await Course.findByPk(courseId);
      const chapter = await Chapter.findByPk(chapterId);

      // Use findOne to get a specific page based on pageId
      const page = await Page.findOne({ where: { id: pageId } });

      if (!course) {
        response.status(404).json({ message: "Course not found" });
        return;
      } else if (!chapter) {
        response.status(404).json({ message: "Chapter not found" });
        return;
      }

      if (request.accepts("html")) {
        response.render("page", {
          title: title,
          role: role,
          user:user,
          course: course,
          content: content,
          chapter: chapter,
          page: page, // Pass the specific page
          csrfToken: request.csrfToken(),
        });
      }
    } catch (error) {
      console.log(error);
      response.status(500).json({ message: "Internal Server Error" });
    }
  }
);

// delete page
app.delete('/page/:pageId', connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
  try {
    const { pageId } = request.params;

    // Corrected the model from Chapter to Page
    const page = await Page.findByPk(pageId);

    if (!page) {
      return response.status(404).json({
        message: 'Page not found'
      });
    }

    await page.destroy();
    return response.json({
      message: 'Page deleted successfully'
    });
  } catch (error) {
    console.log(error);
    return response.status(500).json({
      message: 'Internal Server Error'
    });
  }
});

// delete page
// course enrollement

app.put("/courseEnrolled/:courseId", connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
  const courseId = request.params.courseId;
  const currentUserId = request.user.id;

  try {
    // Check if the user is already enrolled in the course
    const existingEnrollment = await Enrollment.findOne({ where: { userId: currentUserId, courseId } });
    if (existingEnrollment && existingEnrollment.enrollmentStatus) {
      // User is already enrolled
      request.flash('error', 'You are already enrolled in this course.');
      response.redirect(`/home`);
      return;
    } else {
      request.flash('success', 'Enrolled successfully.');
      response.redirect('/home');
    }

    // If not already enrolled, create a new enrollment record
    const newEnrollment = await Enrollment.create({
      userId: currentUserId,
      courseId,
      enrollmentStatus: true, // Set enrollmentStatus to true
    });

    // Fetch the associated Course model for the enrolled course
    const enrolledCourse = await Course.findByPk(courseId);

    // Respond with a success message and redirect to /home

  } catch (error) {
    console.error(error);
    response.status(500).json({ message: "Internal Server Error" });
  }
});



app.post('/page/:pageId/markAsComplete', connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
  const pageId = request.params.pageId;
  const currentUserId = request.user.id; // Get the ID of the logged-in user

  try {
    const page = await Page.findByPk(pageId);

    if (!page) {
      return response.status(404).json({ message: 'Page not found' });
    }

    const user = await User.findByPk(currentUserId);

    if (!user) {
      return response.status(404).json({ message: 'User not found' });
    }

    const userPageCompletion = await Page.findOne({
      where: {
        id: pageId,
        userId: currentUserId
      }
    });
    console.log(userPageCompletion);

    if (userPageCompletion && userPageCompletion.isComplete) {
      return response.status(200).json({ message: 'Page already marked as complete for this user' });
    }

        // Mark the page as complete for the user
    const markAsComplete = await page.update({
      userId: currentUserId,
      id: pageId,
      isComplete: true, 
    });
console.log(markAsComplete);
    return response.status(200).json({ message: 'Page marked as complete for the user' });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ message: 'Failed to mark page as complete for the user' });
  }
});

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
