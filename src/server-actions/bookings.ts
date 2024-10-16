"use server";
import { connectMongoDB } from "<pages>/config/db";
import BookingModel from "<pages>/models/booking-model";
import { message } from "antd";
import { GetCurrentUserFromMongoDB } from "./users";
import { revalidatePath } from "next/cache";
import RoomModel from "<pages>/models/room-model";

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

connectMongoDB();

export const CheckRoomAvailability = async ({
  roomId,
  reqCheckInDate,
  reqCheckOutDate,
}: {
  roomId: string;
  reqCheckInDate: string;
  reqCheckOutDate: string;
}) => {
  try {
    const bookedSlot = await BookingModel.findOne({
      room: roomId,
      bookingStatus: "Booked",
      $or: [
        {
          checkInDate: {
            $gte: reqCheckInDate,
            $lte: reqCheckOutDate,
          },
        },
        {
          checkOutDate: {
            $gte: reqCheckInDate,
            $lte: reqCheckOutDate,
          },
        },
        {
          $and: [
            { checkInDate: { $lte: reqCheckInDate } },
            { checkOutDate: { $gte: reqCheckOutDate } },
          ],
        },
      ],
    });

    if (bookedSlot) {
      return {
        success: false,
      };
    }

    return {
      success: true,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
};

export const BookRoom = async (payload: any) => {
  try {
    const userResponse = await GetCurrentUserFromMongoDB();
    payload.user = userResponse.data._id;
    const booking = new BookingModel(payload);
    await booking.save();
    revalidatePath("/user/bookings");
    return {
      success: true,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message,
    };
  }
};

export const CancelBooking = async ({
  bookingId,
  paymentId,
}: {
  bookingId: string;
  paymentId: string;
}) => {
  try {
    //change the status of the booking to cancelled

    await BookingModel.findByIdAndUpdate(bookingId, {
      bookingStatus: "Cancelled",
    });

    //refund the payment

    const refunded = await stripe.refunds.create({
      payment_intent: paymentId,
    });

    if (refunded.status !== "succeeded") {
      return {
        success: false,
        message:
          "Your booking has been cancelled but the refund failed. Please try again later",
      };
    }

    revalidatePath("/user/bookings");

    return {
      success: true,
      message:
        "Your booking has been cancelled successfully and the refund has been processed",
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message,
    };
  }
};

export const GetAvailableRooms = async ({
  reqCheckInDate,
  reqCheckOutDate,
  type,
}: {
  reqCheckInDate: string;
  reqCheckOutDate: string;
  type: string;
}) => {
  try {
    //if checkin data or checkout date is invalid return data with only type filter
    if (!reqCheckInDate || !reqCheckOutDate) {
      const rooms = await RoomModel.find({
        ...(type && { type }),
      }).populate("villa");
      return {
        success: true,
        data: JSON.parse(JSON.stringify(rooms)),
      };
    }

    //Fist get all the rooms which are booked in the given date range
    const bookedSlots = await BookingModel.find({
      bookingStatus: "Booked",
      $or: [
        {
          checkInDate: {
            $gte: reqCheckInDate,
            $lte: reqCheckOutDate,
          },
        },
        {
          checkOutDate: {
            $gte: reqCheckInDate,
            $lte: reqCheckOutDate,
          },
        },
        {
          $and: [
            { checkInDate: { $lte: reqCheckInDate } },
            { checkOutDate: { $gte: reqCheckOutDate } },
          ],
        },
      ],
    });

    const bookedRoomIds = bookedSlots.map((slot) => slot.room);

    //get all the rooms by excluding the rooms which are booked in the given date range
    const rooms = await RoomModel.find({
      _id: { $nin: bookedRoomIds },
      ...(type && { type }),
    }).populate("villa");

    return {
      success: true,
      data: JSON.parse(JSON.stringify(rooms)),
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message,
    };
  }
};
