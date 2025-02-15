import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import { v2 as cloudinary } from 'cloudinary';
import { response_200, response_201, response_204, response_400, response_401, response_404, response_500 } from "../utils/responseCodes.js";
import upload from "../middlewares/multerMiddleware.js"
import jwt from "jsonwebtoken";


export async function register(req, res) {
  try {
    const {
      FirstName,
      LastName,
      UserName,
      Email,
      Password,
      isAdmin,
      myUpvotes,
      News,
    } = req.body;

    const existingUser = await User.findOne({ UserName: req.body.UserName });
    if (existingUser) {
      return response_400(res, "User already exists");
    }
    //Save

    upload.single('avatar')(req, res, async (err) => {



      if (err) {
        return response_400(res, err.message);
      }

      console.log(req.file)

      const profileImageUrl = req.file ? await uploadToCloudinary(req.file) : null;

      const userCreated = await User.create({
        FirstName,
        LastName,
        UserName,
        ProfileImage: profileImageUrl,
        Email,
        Password,
        isAdmin,
        myUpvotes,
        News,
      });

      res
        .status(201)
        .json({ msg: "Saved", user: userCreated, token: await userCreated.generateToken() });
    });
  } catch (err) {
    console.log(err)
    return response_500(res, "Error in Registering", err);
  }
}

export async function login(req, res) {
  try {
    
    
    
    //console.log(Password);
    const existUser = await User.findOne({ Email: req.body.Email });
    //console.log(existUser);
    if (!existUser) {
      res.status(400).send("User Not Found");
    }
    const passValid = await bcrypt.compare(req.body.Password, existUser.Password);
    //console.log(passValid);
    if (passValid) {
      const token = await existUser.generateToken();
      res.status(201).json({ msg: "UserFound", user: existUser, token });
    } else {
      res.status(401).json({ msg: "Invalid Credentials" });
    }
  } catch (error) {
    console.log(error);
  }
}

export async function verifytoken(req, res) {
    try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_KEY);
        const user = await User.findById(decoded.userId);
        if (!user) {
        return response_401(res, "User not found");
        }
        response_200(res, "User found", user);
    } catch (error) {
        response_500(res, "Internal server error", error);
    }
}



export async function updateUser(req, res) {
  try {
    const userId = req.userId;
    const existingUser = await User.findOne({ _id: userId });
    if (!existingUser) {
      res.status(400).send("User Not Found");
    }
    const {
      FirstName,
      LastName,
      UserName,
      Email,
      Password,
    } = req.body;

    if (req.file) {
      const profileImageUrl = await uploadToCloudinary(req.file);
      existingUser.ProfileImage = profileImageUrl;
    }
    if (FirstName) existingUser.FirstName = FirstName;
    if (LastName) existingUser.LastName = LastName;
    if (UserName) existingUser.UserName = UserName;
    if (Email) existingUser.Email = Email;

    const updatedUser = await existingUser.save();
    res.status(200).json({ message: 'User details updated successfully', user: updatedUser });

  }
  catch (error) {
    console.log(error);
    return response_500(res, 'Error in updating user details', error);
  }

}


export async function allUsers(req, res) {
  try {
    const allUser = await User.find({});
    if (!allUser) {
      response_204(res, "No Users Found");
    }
    response_200(res, "All User Sent", allUser)
  } catch (error) {
    console.log(error);
  }
}

export async function findUser(req, res) {
  try {
    const user = await User.findById(req.params.userId);
    if (user === null) {
      response_204(res, "User Not Found");
    }
    else {
      response_200(res, "User Details Sent", user)
    }
  } catch (error) {
    response_500(res, "Error", error);
  }
}

export async function upVote(req, res) {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId);
    if (!user) {
      response_404(res, 'User not found')
    }
    const hasUpvoted = user.myUpvotes.includes(req.userId);
    if (hasUpvoted) {
      response_400(res, 'User has already upvoted')
    }
    user.myUpvotes.push(req.userId);
    await user.save();
    response_200(res, 'Upvote successful', null, null);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}

export async function deleteUser(req, res) {
  try {
    const id = req.params.userId;
    const result = await User.findByIdAndRemove(id).exec();
    if (!result) {
      response_404(res, 'User not found');
      return;
    }
    console.log(result);
    response_200(res, "Deleted the User", null, null);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}



const uploadToCloudinary = async (file) => {
  try {
    console.log('Uploading to Cloudinary...');
    const result = await cloudinary.uploader.upload(file.path, {
      folder: 'new',
      resource_type: 'auto',
    });
    console.log('Upload successful:', result);
    return result.secure_url;
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw new Error('Error uploading to Cloudinary');
  }
}
