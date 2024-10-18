import BookingModel from "<pages>/models/booking-model";
import React from "react";
import AdminBookingsTable from "../../_common/admin-bookings-table";

async function ReportsData({ searchParams }: { searchParams: any }) {
  const response = await BookingModel.find({
    bookingStatus: "Booked",
    createdAt: {
      $gte: searchParams.startDate,
      $lte: searchParams.endDate,
    },
  }).populate("room").populate("user").populate("villa").sort({ createdAt: -1 });
  const bookings = JSON.parse(JSON.stringify(response));
  const totalBookings = bookings.length;
  const totalRevenue = bookings.reduce(
    (acc: number, booking: any) => acc + booking.totalAmount,
    0
  );


  return (
    <div>
      <div className="md:flex-row flex-col flex gap-10">
        <div
          className="border py-7 px-10 flex flex-col border-solid gap-5"
          style={{
            border: "1px solid #40679E",
          }}
        >
          <h1 className="text-xl font-bold text-gray-600">Total Bookings</h1>
          <h1
            className="text-5xl font-bold text-center"
            style={{ color: "#40679E" }}
          >
            {totalBookings}
          </h1>
        </div>

        <div
          className="border py-7 px-10 flex flex-col border-solid gap-5"
          style={{
            border: "1px solid #944E63",
          }}
        >
          <h1 className="text-xl font-bold text-gray-600">Total Revenue</h1>
          <h1
            className="text-5xl font-bold text-center"
            style={{ color: "#944E63" }}
          >
            LKR {totalRevenue}
          </h1>
        </div>
      </div>

      <AdminBookingsTable bookings={bookings} />
    </div>
  );
}

export default ReportsData;