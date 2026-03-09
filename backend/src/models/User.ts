// models/User.ts

import mongoose, { Schema, Document } from 'mongoose';

export interface IEducation {
  degree: string;
  institution: string;
  year: string;
}

export interface IProject {
  title: string;
  description: string;
  link: string;
}

export interface IWorkExperience {
  company: string;
  role: string;
  duration: string;
  description: string;
}

export interface IUser extends Document {
  name: string;
  email: string;
  bio: string;
  avatar: string;
  googleId?: string;
  education: IEducation;
  projects: IProject[];
  workExperience: IWorkExperience;
}

const educationSchema = new Schema(
  {
    degree: { type: String, default: '' },
    institution: { type: String, default: '' },
    year: { type: String, default: '' },
  },
  { _id: false }
);

const projectSchema = new Schema(
  {
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    link: { type: String, default: '' },
  },
  { _id: false }
);

const workExperienceSchema = new Schema(
  {
    company: { type: String, default: '' },
    role: { type: String, default: '' },
    duration: { type: String, default: '' },
    description: { type: String, default: '' },
  },
  { _id: false }
);

const userSchema: Schema = new Schema({
  name: String,
  email: { type: String, unique: true },
  bio: { type: String, default: '' },
  avatar: { type: String, default: '' },
  googleId: { type: String, default: null },
  education: { type: educationSchema, default: () => ({}) },
  projects: { type: [projectSchema], default: [] },
  workExperience: { type: workExperienceSchema, default: () => ({}) },
});

export default mongoose.model<IUser>('User', userSchema);