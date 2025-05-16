app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      throw new Error('Invalid login credentials');
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      throw new Error('Invalid login credentials');
    }

    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
    res.send({ user, token });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

// Create Course (Instructor only)
app.post('/api/courses', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'instructor') {
      return res.status(403).send({ error: 'Only instructors can create courses' });
    }

    const course = new Course({
      ...req.body,
      instructor: req.user._id
    });

    await course.save();
    res.status(201).send(course);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

// Get All Courses
app.get('/api/courses', async (req, res) => {
  try {
    const courses = await Course.find().populate('instructor', 'name');
    res.send(courses);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));