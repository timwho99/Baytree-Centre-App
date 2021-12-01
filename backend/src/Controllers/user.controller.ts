import { Request, Response } from "express";
import User from "../Models/user.model";
import Mentee from "../Models/mentee.model";
import axios from "axios";
import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Association from "../Models/association.model";
import AssociationInterface from "../Interfaces/association.interface";
import jwt from "jsonwebtoken";
import path from "path";
import nodemailer from "nodemailer";
import _ from "lodash";
import QuestionnaireTemplate from "../Models/questionnairetemplate.model";
import QuestionnaireTemplateInterface from "../Interfaces/questionnairetemplate.interface";
import Questionnaire from "../Models/questionnaire.model";
import xml2js from "xml2js";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const getHashedPassword = async (
  password: string,
  callback: (hash: string) => void
) => {
  bcrypt.hash(password, 10, (hashError, hash) => {
    if (hashError) {
      throw hashError;
    } else {
      callback(hash);
    }
  });
};

const addMongoUser = (req: Request, res: Response) => {
  let {
    first_name,
    last_name,
    DOB,
    email,
    password,
    activity_status,
    start_date,
    role
  } = req.body;

  const user = new User({
    _id: new mongoose.Types.ObjectId(),
    first_name,
    last_name,
    DOB,
    email,
    password,
    activity_status,
    start_date,
    role
  });

  return user
    .save()
    .then((result) => {
      return res.status(201).json({
        message: "Successfully saved user to the database.",
        user: result
      });
    })
    .catch((error) => {
      return res.status(500).json({
        message: "Error adding user to the database.",
        error
      });
    });
};

const getMongoUsers = (req: Request, res: Response) => {
  User.find()
    .select("-password")
    .exec()
    .then((users) => {
      return res.status(200).json({
        users: users,
        count: users.length
      });
    })
    .catch((error) => {
      return res.status(500).json({
        message: "Error getting user from the database.",
        error
      });
    });
};

const getViewUsers = async (req: Request, res: Response) => {
  const result = await getViewUserType(req.params.type as string);
  if (result) {
    return res.status(200).json(result);
  }
  return res.status(400).json({ error: "unable to find users" });
};

const getViewUserType = async (userType: string) => {
  let url: string =
    "https://app.viewsapp.net/api/restful/contacts/" + userType + "/search?q=";

  let result: string = "";
  await axios({
    method: "get",
    url: url,
    auth: {
      username: process.env.VIEW_USERNAME as string,
      password: process.env.VIEW_PASSWORD as string
    },
    responseType: "json",
    transformResponse: [(v) => v]
  })
    .then((response) => {
      result = JSON.parse(response.data);
    })
    .catch((error) => {
      result = error;
    });
  return result;
};

const migrateViewUsers = async (req: Request, res: Response) => {
  try {
    // admins
    const staffs: any = await getViewUserType("staff");
    await createUsers(staffs);

    // mentors
    const mentors: any = await getViewUserType("volunteers");
    await createUsers(mentors);

    // mentees
    const mentees: any = await getViewUserType("participants");
    await createMentees(mentees);
  } catch (error) {
    throw error;
  }
  res.status(200).json({ response: "All View entries migrated" });
};

async function createUsers(data: any) {
  for (const key in data) {
    const viewsUsers = data[key];
    for (const key1 in viewsUsers) {
      const userFields = viewsUsers[key1];
      await User.find({ views_id: userFields["PersonID"] })
        .exec()
        .then((user) => {
          if (user.length === 0) {
            const temporaryPass: string = "admin123";
            bcrypt.hash(temporaryPass, 10, (hashError, hashedPassword) => {
              if (hashError) {
                return {
                  message: hashError.message,
                  error: hashError
                };
              }
              let userType = "Admin";
              if (userFields["TypeName"] === "volunteer") {
                userType = "Mentor";
              }
              const newUser = new User({
                _id: new mongoose.Types.ObjectId(),
                views_id: userFields["PersonID"],
                first_name: userFields["Forename"],
                last_name: userFields["Surname"],
                email:
                  (userFields["Email"] as string) ||
                  ("NO EMAIL ASSOCIATED" as string),
                activity_status:
                  userFields["VolunteerStatus_V_1"] || ("Active" as string),
                password: hashedPassword as string,
                role: userType,
                resetLink: ""
              });
              newUser.save().catch((error) => {
                return console.log("Error adding user", error);
              });
              return console.log(`added user ${userFields["Forename"]}`);
            });
          } else {
            return console.log(`User ${userFields["Forename"]} already exists`);
          }
        });
    }
  }
}

async function createMentees(data: any) {
  for (const key in data) {
    const mentees = data[key];
    for (const key1 in mentees) {
      const menteeFields = mentees[key1];
      await Mentee.find({ views_id: menteeFields["PersonID"] })
        .exec()
        .then((user) => {
          if (user.length === 0) {
            const DoB: Date = new Date(menteeFields["DateOfBirth"]);
            const tempTimeDifference = Math.abs(Date.now() - DoB.getTime());
            const menteeAge: Number = Math.floor(
              tempTimeDifference / (1000 * 3600 * 24) / 365
            );
            const newMentee = new Mentee({
              _id: new mongoose.Types.ObjectId(),
              views_id: menteeFields["PersonID"],
              first_name: menteeFields["Forename"],
              last_name: menteeFields["Surname"],
              age: menteeAge,
              dateOfBirth: DoB
            });
            newMentee.save().catch((error) => {
              return console.error("Error adding Mentee to DB", error);
            });
            return console.log(`added mentee ${menteeFields["Forename"]}`);
          } else {
            return console.log(
              `mentee ${menteeFields["Forename"]} already exists`
            );
          }
        });
    }
  }
}

const createGoalForAssociation = (req: Request, res: Response) => {
  let { mentee_id, goal } = req.body;

  const user: any = req.user;
  const mentor_id: string = user._id as string;

  Association.findOneAndUpdate(
    {
      mentor_id: mentor_id,
      mentee_id: mentee_id
    },
    {
      $push: {
        goals: {
          name: goal,
          is_complete: false
        }
      }
    },
    { new: true }
  )
    .then((result) => {
      if (result == null) {
        return res.status(500).json({
          message: "Warning: Mentor/Mentee pair not found. Are they active?"
        });
      }
      return res.status(201).json({
        message: "Successfully created goal for mentorship.",
        result
      });
    })
    .catch((error) => {
      return res.status(500).json({
        message: "Error creating goal for the mentee/mentor association."
      });
    });
};

const getAssociationsFromMentor = (req: Request, res: Response) => {
  const user: any = req.user;
  const mentor_id: string = user._id as string;

  Association.find({ mentor_id: mentor_id })
    .exec()
    .then((associations) => {
      return res.status(200).json({ associations });
    })
    .catch((error) => {
      return res.status(404).json({
        message: "Error: Mentee id not found.",
        error
      });
    });
};

const getGoalsForAssociation = (req: Request, res: Response) => {
  let { mentee_id } = req.body;
  const user: any = req.user;
  const mentor_id: string = user._id;

  Association.findOne({ mentee_id: mentee_id, mentor_id: mentor_id })
    .exec()
    .then((result: any) => {
      return res.status(200).json({
        goals: result.goals
      });
    })
    .catch((error) => {
      return res.status(400).json({
        message: "Error: Unable to find mentor/mentee association.",
        error: error.message
      });
    });
};

const emailTransporter = nodemailer.createTransport({
  host: "smtp.mail.yahoo.com",
  port: 465,
  service: "yahoo",
  secure: false,
  auth: {
    user: process.env.BAYTREE_EMAIL as string,
    pass: process.env.BAYTREE_EMAIL_SECRET as string
  },
  tls: { rejectUnauthorized: false },
  debug: false,
  logger: true
});

const forgotPassword = (req: Request, res: Response) => {
  console.log("Change Password");
  const mail = req.body.email;
  console.log(mail);
  User.findOne({ email: mail }).exec((err, user) => {
    if (err || !user) {
      return res
        .status(400)
        .json({ error: "User with this email does not exist" });
    }

    const token = jwt.sign({ _id: user._id }, process.env.JWT_KEY as string, {
      expiresIn: "20m"
    });

    const mailOptions = {
      from: "baytree.earth@yahoo.com",
      to: mail,
      subject: "Password Reset Link",
      html: ` <h2>Please click on the link below to reset your password</h2>
              <br>
              <a href="http://${process.env.URL}/users/resetpassword/${token}">http://${process.env.URL}/users/resetpassword/${token}</a>`
    };

    return user.updateOne(
      { resetLink: token },
      function (err: any, success: any) {
        if (err) {
          return res.status(400).json({ error: "Reset password link error" });
        } else {
          // send email to user
          emailTransporter.sendMail(mailOptions, (error: any, info: any) => {
            if (error) {
              return console.log(error);
            }
            console.log("Message sent: %s", info.messageId);
          });
          return res.json({
            message: "Email has been sent, kindly follow the instructions"
          });
        }
      }
    );
  });
};

const createAssociation = (req: Request, res: Response) => {
  let { mentor_id, mentee_id } = req.body;

  Association.findOne({
    mentor_id: mentor_id,
    mentee_id: mentee_id,
    isActive: true
  }).exec((err, association) => {
    if (association) {
      return res.status(400).json({
        error: "This specific Mentor-Mentee association is already active"
      });
    }
    User.findOne({ _id: mentor_id }).exec((err, user) => {
      if (err || !user) {
        return res.status(400).json({
          error: "Specified Mentor does not exist"
        });
      }
      Mentee.findOne({ _id: mentee_id }).exec((err, mentee) => {
        if (err || !mentee) {
          return res
            .status(400)
            .json({ error: "Specified Mentee does not exist" });
        }
        const newAssociation: AssociationInterface = new Association({
          mentor_id: mentor_id,
          mentee_id: mentee_id,
          isActive: true
        });

        newAssociation
          .save()
          .then((result) => {
            return res.status(200).json({
              message: "Successfully created association",
              result
            });
          })
          .catch((err) => {
            return res.status(400).json({
              message: "Error creating association :",
              err
            });
          });
      });
    });
  });
};

const resetPassword = (req: Request, res: Response) => {
  const { resetLink, newPass } = req.body;
  if (resetLink) {
    jwt.verify(
      resetLink,
      process.env.JWT_KEY as string,
      (err: any, decodedData: any) => {
        if (err) {
          return res.status(401).json({ error: "Incorrect or expired token " });
        }
        User.findOne({ resetLink }).exec((err, user: any) => {
          if (err || !user) {
            return res
              .status(400)
              .json({ error: "User with this token does not exist." });
          }
          getHashedPassword(newPass, (hash: string) => {
            const obj = {
              password: hash,
              resetLink: ""
            };

            user = _.extend(user, obj);

            user!.save((err: any, result: any) => {
              if (err) {
                return res.status(400).json({ error: "Reset password error " });
              } else {
                return res
                  .status(200)
                  .json({ message: "Your password has been changed " });
              }
            });
          });
        });
      }
    );
  } else {
    return res.status(401).json({ error: "Authentication Error " });
  }
};

const assignQuestionnaireToAssociation = async (
  req: Request,
  res: Response
) => {
  const association_id: string = req.params.assid;
  const template_id: string = req.params.tempid;
  const builder = new xml2js.Builder();

  Association.findOne({ _id: association_id })
    .exec()
    .then((assoc) => {
      const user_id = assoc?.mentor_id;

      User.findOne({ _id: user_id })
        .exec()
        .then((user_profile) => {
          const user_views_id = user_profile?.views_id;

          let resBody = {
            answers: {
              EntityType: "Person",
              EntityID: user_views_id
            }
          };

          const xmlInput = builder.buildObject(resBody);

          axios({
            method: "post",
            url:
              "https://app.viewsapp.net/api/restful/evidence/questionnaires/" +
              template_id +
              "/answers",
            auth: {
              username: process.env.VIEW_USERNAME as string,
              password: process.env.VIEW_PASSWORD as string
            },
            data: xmlInput,
            headers: {
              "Content-Type": "text/xml",
              Accept: "text/xml"
            },
            responseType: "json",
            transformResponse: [(v) => v]
          }).then((result) => {
            const questid = xml2js.parseString(result.data, (err, result) => {
              if (err) {
                return;
              }
              const val: any = Object.values(result.answerset)[0];
              const val_id = val.id;
              console.log(val_id);
              Association.findOneAndUpdate(
                {
                  _id: association_id
                },
                { questionnaire_id: val_id },
                { new: true }
              )
                .exec()
                .then((association) => {});
            });

            const val = result.data;
            res.type("text/xml");
            return res.status(200).send({
              val
            });
          });
        });
    });
};

const updateQuestionnaireValues = async (req: Request, res: Response) => {
  const answer = req.body;
  const template_id: string = req.params.id;
  const builder = new xml2js.Builder();

  let resBody = {
    answers: {
      EntityType: "Person",
      EntityID: 1,
      answer: answer
    }
  };

  const xmlInput = builder.buildObject(resBody);

  await axios({
    method: "post",
    url:
      "https://app.viewsapp.net/api/restful/evidence/questionnaires/" +
      template_id +
      "/answers",
    auth: {
      username: process.env.VIEW_USERNAME as string,
      password: process.env.VIEW_PASSWORD as string
    },
    data: xmlInput,
    headers: {
      "Content-Type": "text/xml",
      Accept: "text/xml"
    },
    responseType: "json",
    transformResponse: [(v) => v]
  }).then((result) => {
    const val = result.data;

    res.type("text/xml");

    return res.status(200).send({
      val
    });
  });
};

const getMyProfile = (req: Request, res: Response) => {
  let user: any = req.user;
  delete user["password"];
  return res.status(200).json(user);
};

const editProfile = (req: Request, res: Response) => {
  const user: any = req.body.user;
  User.updateOne(
    { _id: user._id },
    {
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      activity_status: user.activity_status,
      role: user.role
    }
  ).exec((err, user) => {
    if (err) {
      res
        .status(400)
        .json({ error: "Error occured while updating profile", err });
    }
  });
};

const getUsers = (req: Request, res: Response) => {};

const UserController = {
  addMongoUser,
  getMongoUsers,
  getViewUsers,
  migrateViewUsers,
  createGoalForAssociation,
  createAssociation,
  getAssociationsFromMentor,
  getGoalsForAssociation,
  forgotPassword,
  resetPassword,
  getHashedPassword,
  assignQuestionnaireToAssociation,
  updateQuestionnaireValues,
  getMyProfile,
  getUsers,
  editProfile
};

export default UserController;
