console.log("LMS Application")


// <% if (role === 'student') { %>
//     <hr />
//     <h3 class="text-2xl font-semibold">Enrolled Courses</h3>
//     <% try { %>
//       <% if (enrolledCourses && enrolledCourses.length) { %>
//         <%= console.log("enrolledCourses:", enrolledCourses) %>
//         <%= console.log("course:", course) %>
    
//         <% enrolledCourses.forEach(function(enrollment) { %>
//           <% if (enrollment.courseId === course.id && enrollment.enrollmentStatus === true) { %>
//             <div class="course-card">
//               <h2><%= course.title %></h2>
//               <p>Course ID: <%= course.id %></p>
//               <p>Educator: <%= course.educatorName %></p>
//               <a href="/course/<%= course.id %>" class="button blue">View</a>
//               <span class="enrolled">Enrolled</span>
//             </div>
//           <% } %>
//         <% }); %>
//       <% } %>
//     <% } catch (error) { %>
//       <p>Error: <%= error.message %></p>
//     <% } %>