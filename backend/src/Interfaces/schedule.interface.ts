import {Document} from 'mongoose'

export default interface ScheduleInterface extends Document {
    uid: String,
    mentee_name: String,
    scheduled_start_time: Date,
    scheduled_end_time: Date,
    day_of_the_week: String,
    mentoring_start_date: Date,
}