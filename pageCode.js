import wixData from 'wix-data';
import { sendEmailToUser } from 'backend/sendMail.web.js';

let receiptImg;
$w.onReady(function () {
    hideMessages();

    $w("#imageUpload").onChange(() => {
        $w("#submitButton").disable()
        $w("#imageUpload")
            .uploadFiles()
            .then((uploadedFiles) => {
                uploadedFiles.forEach((uploadedFile) => {
                    console.log("File url:", uploadedFile.fileUrl);
                    receiptImg = uploadedFile.fileUrl;
                    $w("#submitButton").enable()
                });
            })
            .catch((uploadError) => {
                let errCode = uploadError.errorCode; // 7751
                let errDesc = uploadError.errorDescription; // "Error description"
            });

    })

    $w("#submitButton").onClick(async () => {
        hideMessages();

        $w("#loading").expand();

        try {
            const name = $w("#nameInput").value;
            const email = $w("#emailInput").value;
            const serial = $w("#serialInput").value;
            const selectedDate = $w("#datePicker").value;

            console.log(selectedDate.toDateString())

            if (!name || !email || !serial || !selectedDate) {
                showErrorMessage("Please fill out all required fields");

                return;
            }

            if (!isValidEmail(email)) {
                showErrorMessage("Please enter a valid email address.");

                return;
            }

            if (!receiptImg) {
                showErrorMessage("Please upload Receipt Image.");

                return;
            }

            const response = await registerWarranty({
                name,
                email,
                selectedDate: selectedDate,
                image: receiptImg,
                serialNumber: serial
            });

            if (response.success) {
                showSuccessMessage(response.message);

                $w("#congrats").expand();
                setTimeout(() => {
                    $w("#congrats").collapse();
                    reset();
                }, 3000);

            } else {
                showErrorMessage(response.message);
            }
        } catch (error) {
            console.error("Error during form submission:", error);
            showErrorMessage("An unexpected error occurred. Please try again.");

        }
    });
});

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function hideMessages() {
    $w("#successMessage").hide();
    $w("#errorMessage").hide();
    $w("#loading").collapse();

}

function showSuccessMessage(message) {
    $w("#successMessage").text = message;
    $w("#successMessage").show();
    $w("#loading").collapse();

}

function showErrorMessage(message) {
    $w("#errorMessage").text = message;
    $w("#errorMessage").show();
    $w("#loading").collapse();

}

async function registerWarranty(data) {
    try {
        const { name, email, selectedDate, image, serialNumber } = data;

        const serialQuery = await wixData.query("MySerialNumbers")
            .eq("serialNumbers", serialNumber)
            .find();

        if (serialQuery.items.length === 0) {
            return { success: false, message: "This Serial number does not exist." };
        }

        const serialData = serialQuery.items[0];
        if (serialData.isAvailable == true) {
            return { success: false, message: "This Serial number is already Registered." };
        }

        console.log(serialData);
        let date = selectedDate
        console.log("date: ", date)
        await wixData.insert("RegisteredWarranty", {
            name,
            email,
            date,
            image,
            serialNumber: serialNumber
        });

        const userObject = {
            name: name,
            date: date.toDateString(),
            serial: serialNumber,
            email: email

        };

        serialData.isAvailable = true;
        await wixData.update("MySerialNumbers", serialData);

        const emailTemplateId = "UXsdtVy"; // 
        try {
            await sendEmailToUser(userObject, emailTemplateId);
            console.log("Triggered email sent successfully.");

        } catch (error) {
            console.error("Error sending email:", error);
        }

        return { success: true, message: "Warranty registered successfully!" };

    } catch (error) {
        console.error("Error in registerWarranty:", error);
        return { success: false, message: "An unexpected error occurred." };
    }
}

function reset() {
    $w("#nameInput").value = undefined;
    $w("#nameInput").resetValidityIndication()
    $w("#emailInput").value = undefined;
    $w("#emailInput").resetValidityIndication()
    $w("#serialInput").value = undefined;
    $w("#serialInput").resetValidityIndication()
    $w("#datePicker").value = undefined;
    $w("#datePicker").resetValidityIndication()
    receiptImg = ''
    $w("#imageUpload").reset;
    $w("#imageUpload").resetValidityIndication()

    hideMessages();
}
