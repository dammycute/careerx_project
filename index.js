const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
require('dotenv').config();

const User = require('./model/userModel');
const Course = require('./model/courseModel');
const auth = require('./middleware/auth');
const authorize = require('./middleware/authorize');
const Enrollment = require('./model/enrollment');

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URL, {
  // useNewUrlParser: true,
  // useUnifiedTopology: true
}).then(() => console.log('MongoDB connected...'))
  .catch(err => console.error('MongoDB connection error:', err));

app.post('/api/register', async (req, res) =>{
  const { name, email, password, role } = req.body

  if (!name|| !email || !password){
      return res.status(400).json({message: "Fill all neccessary fields"})
    }

  try {
    const existingUser = await User.findOne({email})
    if (existingUser){
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser  = new User({
      name,
      email, 
      password: hashedPassword,
      role
    });

    await newUser.save();
    const userToReturn = newUser.toObject()
    delete userToReturn.password
    res.status(201).json({ message: "User created successfully", user: userToReturn})
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server error", error: err.message})
  }
})


// User Login 

app.post('/api/login', async (req, res) =>{
  const { email, password } = req.body;

  if (!email || !password){
    return res.status(400).json({message: "Email and password are required"})
  }

  try {
    // Check if the user exists
    const user = await User.findOne({email})
    if (!User){
      return res.status(401).json({message: 'Invalid credentials'})
    }

    // Compare the passwords: Check if the password entered is the same as the password the user used for signup
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch){
      return res.status(401).json({message: 'Invalid credentials'})
    }

    // Generate the JWT token for Login
    const token = jwt.sign(
      {id: user.id, email: user.email},
      process.env.JWT_SECRET,
      {expiresIn: '2hr'}
    );

    res.status(200).json({message: 'Login successful', token, user: [
      {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    ]})
  } catch (error) {
    console.error(error)
    res.status(500).json({message: 'Internal server error', error: error.errors})
  }
})

// Course Creation by Instructors
app.post('/api/courses', auth, authorize(['instructor']),  async (req, res) => {
  const { title, description, instructor } = req.body;

  if (!title || !description || !instructor) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const course = new Course({ title, description, instructor });
    await course.save();
    res.status(201).json({ message: 'Course created successfully', course });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get all the courses 
app.get('/api/courses', auth, async (req, res) => {
  try {
    const courses = await Course.find().populate('instructor', 'username email');
    res.status(200).json(courses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});


// Enrollment Endpoint 

app.post('/api/enroll/:courseId', auth, async (req, res) =>{
  const { courseId } = req.params

  if (req.user.role != 'student'){
    return res.status(403).json({message: 'Only students can enroll' })
  }

  try {
    // Check if course exists
    const course = await Course.findById(CourseId);

    if (!course) {
      return res.status(404).json({message: 'Course not found'});
    }

    // Check if already enrolled 
    const existing = await Enrollment.findOne({
      student: req.user.id, 
      course: courseId
    });

    if (existing) {
      return res.status(400).json({message: 'Already enrolled in this course'})
    }


    // Create new enrollment 
    const enrollment = new Enrollment.find.One({
      student: req.user.id,
      course: courseId
    });
    await enrollment.save();
    res.status(201).json({message: 'Enrollment Successful'})
  } catch (err) {
    console.log(err)
    res.status(500).json({message: err.message})
  }
})


app.get('/courses/:id/students', auth, async (req, res) => {
  const courseId = req.params.id;

  try {
    // Make sure the logged-in user is the instructor of the course
    const course = await Course.findById(courseId);
    if (!course || course.instructor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Find enrollments for this course and populate student info
    const enrollments = await Enrollment.find({ course: courseId }).populate('student', 'username email');

    res.status(200).json(enrollments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});



const PORT = process.env.PORT || 2000;
  app.listen(PORT, () => console.log(`Server is running on port ${PORT}`))



