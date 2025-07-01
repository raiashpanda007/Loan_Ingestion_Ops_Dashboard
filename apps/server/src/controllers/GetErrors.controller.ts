import { asyncHandler, Response } from "../utils";
import Prisma from "@workspace/db";

const GetErrorsController = asyncHandler(async (req, res) => {
    const allErrors = await Prisma.loanError.findMany({});
    return res.status(200).json(
        new Response(
            200, "All Errors", allErrors)

    )
})

export default GetErrorsController;